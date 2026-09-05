'use server';

import { supabase } from '@/lib/supabase';
import { 
  WaterSupplyInput, 
  WaterSupplyData, 
  WaterWithdrawalInput, 
  WaterWithdrawalData, 
  WaterAnnualMonthRow,
  OFFICIAL_CONTRACT_SCHEDULE,
  HISTORICAL_RECEIVED_BASE
} from '@/lib/waterSupplyTypes';

// ==========================================
// 1. RECEPCIONES DE PROVEEDOR (ENTRADAS)
// ==========================================

/**
 * Registrar una entrega de agua por parte del proveedor
 */
export async function createWaterDelivery(data: WaterSupplyInput) {
  try {
    if (!data.deliveryDate) {
      return { success: false, error: 'La fecha de entrega es obligatoria.' };
    }
    if (data.bottlesReceived === undefined || data.bottlesReceived < 0) {
      return { success: false, error: 'La cantidad de botellones recibidos es obligatoria.' };
    }
    if (data.bottlesContracted === undefined || data.bottlesContracted < 0) {
      return { success: false, error: 'La cantidad estipulada por contrato es obligatoria.' };
    }
    if (!data.receivedBy || !data.receivedBy.trim()) {
      return { success: false, error: 'El nombre de quien recibe la dotación es obligatorio.' };
    }

    const payload = {
      delivery_date: data.deliveryDate,
      receipt_number: data.receiptNumber ? data.receiptNumber.trim().toUpperCase() : null,
      supplier_name: (data.supplierName || 'PROVEEDOR OFICIAL DE AGUA').trim().toUpperCase(),
      bottles_received: Number(data.bottlesReceived),
      bottles_contracted: Number(data.bottlesContracted),
      bottle_capacity: data.bottleCapacity || '20 Litros',
      container_condition: data.containerCondition || 'Conforme y Sellado',
      received_by: data.receivedBy.trim().toUpperCase(),
      observations: data.observations ? data.observations.trim().toUpperCase() : null
    };

    const { data: record, error } = await supabase
      .from('water_supplies')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Error insertando en water_supplies:', error);
      return { success: false, error: `Error al guardar: ${error.message}` };
    }

    return { success: true, id: record.id };
  } catch (error: any) {
    console.error('Error in createWaterDelivery:', error);
    return { success: false, error: error?.message || 'Error inesperado al registrar la entrega de agua.' };
  }
}

/**
 * Obtener historial de entregas de agua con cálculo de saldo
 */
export async function getWaterDeliveries(monthYear?: string) {
  try {
    let query = supabase
      .from('water_supplies')
      .select('*')
      .order('delivery_date', { ascending: false });

    if (monthYear && monthYear !== 'all') {
      query = query.gte('delivery_date', `${monthYear}-01`).lte('delivery_date', `${monthYear}-31`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar water_supplies:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      ...item,
      difference: Number(item.bottles_received || 0) - Number(item.bottles_contracted || 0)
    }));
  } catch (error) {
    console.error('Error en getWaterDeliveries:', error);
    return [];
  }
}

/**
 * Eliminar un registro de entrega de agua
 */
export async function deleteWaterDelivery(id: string) {
  try {
    const { error } = await supabase
      .from('water_supplies')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar el registro.' };
  }
}

/**
 * Obtener consolidado mensual de auditoría de agua
 */
export async function getWaterMonthlySummary(monthYear?: string) {
  try {
    const data = await getWaterDeliveries(monthYear);
    const totalReceived = data.reduce((acc, curr: any) => acc + (Number(curr.bottles_received) || 0), 0);
    const totalContracted = data.reduce((acc, curr: any) => acc + (Number(curr.bottles_contracted) || 0), 0);
    const totalDifference = totalReceived - totalContracted;

    return {
      success: true,
      totalReceived,
      totalContracted,
      totalDifference,
      deliveriesCount: data.length,
      records: data
    };
  } catch (error: any) {
    return {
      success: false,
      totalReceived: 0,
      totalContracted: 0,
      totalDifference: 0,
      deliveriesCount: 0,
      records: []
    };
  }
}

// ==========================================
// 2. MATRIZ ANUAL DEL CONTRATO (440 BIDONES)
// ==========================================

/**
 * Genera la matriz de auditoría anual exacta (Febrero a Diciembre - 440 recargas)
 * Integrando tanto la base histórica auditada del contrato como nuevas entregas en el sistema.
 */
export async function getAnnualContractAudit() {
  try {
    const { data: dbDeliveries } = await supabase
      .from('water_supplies')
      .select('delivery_date, bottles_received');

    // Mapear entregas de la base de datos por mes (1-12)
    const dbByMonth: { [key: number]: number } = {};
    if (dbDeliveries && dbDeliveries.length > 0) {
      dbDeliveries.forEach((d: any) => {
        if (!d.delivery_date) return;
        const month = parseInt(d.delivery_date.split('-')[1], 10);
        dbByMonth[month] = (dbByMonth[month] || 0) + Number(d.bottles_received || 0);
      });
    }

    // Construir cada fila de mes
    const rows: WaterAnnualMonthRow[] = OFFICIAL_CONTRACT_SCHEDULE.map((sch) => {
      // Usar lo registrado en la BD si existe, o el consolidado histórico oficial
      const received = dbByMonth[sch.monthNum] !== undefined && dbByMonth[sch.monthNum] > 0
        ? Math.max(dbByMonth[sch.monthNum], HISTORICAL_RECEIVED_BASE[sch.monthNum] || 0)
        : (HISTORICAL_RECEIVED_BASE[sch.monthNum] || 0);

      const balance = sch.quota - received;
      const status = balance > 0 
        ? 'Disponible' 
        : balance < 0 
        ? 'Excedido' 
        : 'Cumplido';

      return {
        monthName: sch.monthName,
        monthNum: sch.monthNum,
        contractQuota: sch.quota,
        received,
        balance,
        status
      };
    });

    // Totales Anuales (Febrero a Diciembre)
    const totalContractYear = rows.reduce((acc, r) => acc + r.contractQuota, 0); // 440
    const totalReceivedYear = rows.reduce((acc, r) => acc + r.received, 0);
    const totalRemainingContract = totalContractYear - totalReceivedYear;

    // Resumen acumulado corte a Agosto (meses 2 a 8)
    const augustCutoffRows = rows.filter((r) => r.monthNum >= 2 && r.monthNum <= 8);
    const cumulativeAugustQuota = augustCutoffRows.reduce((acc, r) => acc + r.contractQuota, 0); // 255
    const cumulativeAugustReceived = augustCutoffRows.reduce((acc, r) => acc + r.received, 0); // 286
    const cumulativeExcessAugust = cumulativeAugustReceived - cumulativeAugustQuota; // 31

    return {
      success: true,
      rows,
      summary: {
        totalContractYear,
        totalReceivedYear,
        totalRemainingContract,
        cumulativeAugustQuota,
        cumulativeAugustReceived,
        cumulativeExcessAugust
      }
    };
  } catch (error: any) {
    console.error('Error in getAnnualContractAudit:', error);
    return {
      success: false,
      rows: [],
      summary: {
        totalContractYear: 440,
        totalReceivedYear: 286,
        totalRemainingContract: 154,
        cumulativeAugustQuota: 255,
        cumulativeAugustReceived: 286,
        cumulativeExcessAugust: 31
      }
    };
  }
}

// ==========================================
// 3. SALIDAS / RETIROS DE AGUA POR SECTORES
// ==========================================

/**
 * Registrar una salida individual de botellón a un sector/persona
 */
export async function createWaterWithdrawal(data: WaterWithdrawalInput) {
  try {
    if (!data.withdrawalDate) return { success: false, error: 'Fecha requerida' };
    if (!data.recipientName?.trim()) return { success: false, error: 'Nombre de la persona requerido' };
    if (!data.sector?.trim()) return { success: false, error: 'Sector o departamento requerido' };
    if (!data.bottlesQuantity || data.bottlesQuantity <= 0) return { success: false, error: 'Cantidad inválida' };

    const payload = {
      withdrawal_date: data.withdrawalDate,
      recipient_name: data.recipientName.trim().toUpperCase(),
      sector: data.sector.trim().toUpperCase(),
      bottles_quantity: Math.round(Number(data.bottlesQuantity)),
      signature_present: data.signaturePresent ?? true,
      photo_url: data.photoUrl || null,
      notes: data.notes ? data.notes.trim().toUpperCase() : null
    };

    // Intentar insertar en tabla especializada water_withdrawals
    const { data: record, error } = await supabase
      .from('water_withdrawals')
      .insert([payload])
      .select()
      .single();

    if (error) {
      // Si la tabla aún no existe, fallback transparente a water_supplies con marca especial
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.code === '42P01') {
        const fallbackPayload = {
          delivery_date: data.withdrawalDate,
          supplier_name: 'SALIDA_SECTOR',
          received_by: data.recipientName.trim().toUpperCase(),
          observations: `SECTOR: ${data.sector.trim().toUpperCase()} | NOTA: ${data.notes || 'RETIRO'}`,
          bottles_received: 0,
          bottles_contracted: Math.round(Number(data.bottlesQuantity)),
          bottle_capacity: '20 Litros',
          container_condition: 'Retirado por Sector'
        };
        const { data: fbRecord, error: fbError } = await supabase
          .from('water_supplies')
          .insert([fallbackPayload])
          .select()
          .single();

        if (fbError) throw fbError;
        return { success: true, id: fbRecord.id };
      }
      throw error;
    }

    return { success: true, id: record.id };
  } catch (error: any) {
    console.error('Error in createWaterWithdrawal:', error);
    return { success: false, error: error?.message || 'No se pudo guardar la salida de agua.' };
  }
}

/**
 * Registrar un lote masivo de salidas de botellones (ej: tras procesar con OCR)
 */
export async function createBulkWaterWithdrawals(withdrawals: WaterWithdrawalInput[]) {
  if (!withdrawals || withdrawals.length === 0) {
    return { success: false, error: 'No hay retiros para registrar.' };
  }

  let savedCount = 0;
  const errors: string[] = [];

  for (const item of withdrawals) {
    const res = await createWaterWithdrawal(item);
    if (res.success) {
      savedCount++;
    } else {
      errors.push(`${item.recipientName}: ${res.error}`);
    }
  }

  return {
    success: savedCount > 0,
    savedCount,
    total: withdrawals.length,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Obtener listado de salidas / retiros de agua
 */
export async function getWaterWithdrawals(monthYear?: string) {
  try {
    let query = supabase
      .from('water_withdrawals')
      .select('*')
      .order('withdrawal_date', { ascending: false });

    if (monthYear && monthYear !== 'all') {
      query = query.gte('withdrawal_date', `${monthYear}-01`).lte('withdrawal_date', `${monthYear}-31`);
    }

    const { data, error } = await query;

    if (error) {
      // Fallback si la tabla no está creada aún en Supabase: buscar en water_supplies con marca 'SALIDA_SECTOR'
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.code === '42P01') {
        let fbQuery = supabase
          .from('water_supplies')
          .select('*')
          .eq('supplier_name', 'SALIDA_SECTOR')
          .order('delivery_date', { ascending: false });

        if (monthYear && monthYear !== 'all') {
          fbQuery = fbQuery.gte('delivery_date', `${monthYear}-01`).lte('delivery_date', `${monthYear}-31`);
        }

        const { data: fbData } = await fbQuery;

        return (fbData || []).map((d: any) => {
          const obs = d.observations || '';
          const sectorMatch = obs.match(/SECTOR:\s*([^|]+)/i);
          const sector = sectorMatch ? sectorMatch[1].trim() : 'GENERAL';
          return {
            id: d.id,
            withdrawal_date: d.delivery_date,
            recipient_name: d.received_by,
            sector,
            bottles_quantity: d.bottles_contracted || 1,
            signature_present: true,
            photo_url: null,
            notes: obs,
            created_at: d.created_at
          };
        });
      }
      console.error('Error al consultar water_withdrawals:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getWaterWithdrawals:', error);
    return [];
  }
}

/**
 * Eliminar una salida de agua registrada
 */
export async function deleteWaterWithdrawal(id: string) {
  try {
    const { error } = await supabase
      .from('water_withdrawals')
      .delete()
      .eq('id', id);

    if (error) {
      // Intentar también en water_supplies por si fue grabado en fallback
      await supabase.from('water_supplies').delete().eq('id', id);
      return { success: true };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar salida de agua.' };
  }
}

/**
 * Balance general de inventario de agua:
 * Botellones ingresados por proveedor vs Botellones despachados a sectores = Stock disponible
 */
export async function getWaterInventoryBalance() {
  try {
    // 1. Total recibidos del proveedor (excluyendo salidas fallback)
    const { data: supplies } = await supabase
      .from('water_supplies')
      .select('bottles_received, supplier_name');

    const totalReceivedFromSuppliers = (supplies || [])
      .filter((s: any) => s.supplier_name !== 'SALIDA_SECTOR')
      .reduce((acc, curr: any) => acc + (Number(curr.bottles_received) || 0), 0);

    // Sumar la base histórica no cargada en BD (286 total acumulado a agosto)
    const totalReceived = Math.max(totalReceivedFromSuppliers, 286);

    // 2. Total salidas a sectores
    const withdrawals = await getWaterWithdrawals();
    const totalDispatched = withdrawals.reduce(
      (acc: number, curr: any) => acc + (Number(curr.bottles_quantity) || 0),
      0
    );

    // 3. Stock actual de botellones llenos en almacén
    const currentStock = Math.max(0, totalReceived - totalDispatched);

    // 4. Desglose detallado por áreas con frecuencia semanal y mensual
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

    const currentMonthPrefix = new Date().toISOString().substring(0, 7);

    const bySector: { 
      [key: string]: { 
        count: number; 
        totalBottles: number; 
        weeklyCount: number; 
        monthlyCount: number; 
        lastDate: string 
      } 
    } = {};

    withdrawals.forEach((w: any) => {
      const s = (w.sector || 'GENERAL').toUpperCase().trim();
      const qty = Number(w.bottles_quantity) || 1;
      const wDate = w.withdrawal_date || '';

      if (!bySector[s]) {
        bySector[s] = { count: 0, totalBottles: 0, weeklyCount: 0, monthlyCount: 0, lastDate: wDate };
      }

      bySector[s].count += 1;
      bySector[s].totalBottles += qty;

      if (wDate >= oneWeekAgoStr) {
        bySector[s].weeklyCount += 1;
      }
      if (wDate.startsWith(currentMonthPrefix)) {
        bySector[s].monthlyCount += 1;
      }
      if (wDate > bySector[s].lastDate) {
        bySector[s].lastDate = wDate;
      }
    });

    const sectorStats = Object.entries(bySector)
      .map(([sector, data]) => ({
        sector,
        count: data.totalBottles,
        totalBottles: data.totalBottles,
        withdrawalsCount: data.count,
        weeklyCount: data.weeklyCount,
        monthlyCount: data.monthlyCount,
        lastDate: data.lastDate
      }))
      .sort((a, b) => b.totalBottles - a.totalBottles);

    return {
      success: true,
      totalReceived,
      totalDispatched,
      currentStock,
      sectorStats
    };
  } catch (error: any) {
    console.error('Error in getWaterInventoryBalance:', error);
    return {
      success: false,
      totalReceived: 286,
      totalDispatched: 0,
      currentStock: 286,
      sectorStats: []
    };
  }
}

/**
 * Consolidado unificado para cargar todo el panel de Control de Agua en una sola llamada ultrarrápida.
 */
export async function getWaterDashboardData(monthYear?: string) {
  try {
    const [deliveries, withdrawals, annualAudit] = await Promise.all([
      getWaterDeliveries(monthYear),
      getWaterWithdrawals(monthYear),
      getAnnualContractAudit()
    ]);

    const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];
    const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];

    const totalReceived = safeDeliveries.reduce((acc, curr: any) => acc + (Number(curr.bottles_received) || 0), 0);
    const totalContracted = safeDeliveries.reduce((acc, curr: any) => acc + (Number(curr.bottles_contracted) || 0), 0);
    const totalDifference = totalReceived - totalContracted;

    // Despachos
    const totalDispatched = safeWithdrawals.reduce(
      (acc: number, curr: any) => acc + (Number(curr.bottles_quantity) || 0),
      0
    );
    const totalReceivedAllTime = Math.max(totalReceived, 286);
    const currentStock = Math.max(0, totalReceivedAllTime - totalDispatched);

    // Frecuencias por Área
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);

    const bySector: { [key: string]: any } = {};
    safeWithdrawals.forEach((w: any) => {
      const s = (w.sector || 'GENERAL').toUpperCase().trim();
      const qty = Number(w.bottles_quantity) || 1;
      const wDate = w.withdrawal_date || '';

      if (!bySector[s]) {
        bySector[s] = { count: 0, totalBottles: 0, weeklyCount: 0, monthlyCount: 0, lastDate: wDate };
      }
      bySector[s].count += 1;
      bySector[s].totalBottles += qty;
      if (wDate >= oneWeekAgoStr) bySector[s].weeklyCount += 1;
      if (wDate.startsWith(currentMonthPrefix)) bySector[s].monthlyCount += 1;
      if (wDate > bySector[s].lastDate) bySector[s].lastDate = wDate;
    });

    const sectorStats = Object.entries(bySector)
      .map(([sector, data]) => ({
        sector,
        count: data.totalBottles,
        totalBottles: data.totalBottles,
        withdrawalsCount: data.count,
        weeklyCount: data.weeklyCount,
        monthlyCount: data.monthlyCount,
        lastDate: data.lastDate
      }))
      .sort((a, b) => b.totalBottles - a.totalBottles);

    return {
      success: true,
      deliveries: safeDeliveries,
      summary: {
        totalReceived,
        totalContracted,
        totalDifference,
        deliveriesCount: safeDeliveries.length
      },
      withdrawals: safeWithdrawals,
      inventoryBalance: {
        totalReceived: totalReceivedAllTime,
        totalDispatched,
        currentStock,
        sectorStats
      },
      annualData: annualAudit || {
        rows: [],
        summary: {
          totalContractYear: 440,
          totalReceivedYear: 286,
          totalRemainingContract: 154,
          cumulativeAugustQuota: 255,
          cumulativeAugustReceived: 286,
          cumulativeExcessAugust: 31
        }
      }
    };
  } catch (error: any) {
    console.error('Error in getWaterDashboardData:', error);
    return {
      success: false,
      deliveries: [],
      summary: { totalReceived: 0, totalContracted: 0, totalDifference: 0, deliveriesCount: 0 },
      withdrawals: [],
      inventoryBalance: { totalReceived: 286, totalDispatched: 0, currentStock: 286, sectorStats: [] },
      annualData: {
        rows: [],
        summary: {
          totalContractYear: 440,
          totalReceivedYear: 286,
          totalRemainingContract: 154,
          cumulativeAugustQuota: 255,
          cumulativeAugustReceived: 286,
          cumulativeExcessAugust: 31
        }
      }
    };
  }
}

// ==========================================
// 4. RECONOCIMIENTO CON IA (OCR VISION)
// ==========================================

/**
 * Escanea y digitaliza una foto de la planilla física firmada de entrega de agua.
 * Detecta filas manuscritas o impresas con: Fecha, Nombre, Sector, Cantidad y Firma.
 */
export async function analyzeWaterDeliverySheet(imageBase64: string) {
  try {
    if (!imageBase64) {
      return { success: false, error: 'No se recibió la imagen de la planilla.' };
    }

    const apiKey = process.env.OPENCODE_GO_API_KEY || 'sk-uiqURVX900evBUHKomZL4LjIe3L1NvILaNAcATY4oZ6rWvDMoVAt9ODP3F6Q8g97';
    const baseUrl = process.env.OPENCODE_GO_BASE_URL || 'https://opencode.ai/zen/go/v1';
    const model = process.env.OPENCODE_GO_MODEL || 'deepseek-v4-flash-vision-exp';

    // Normalizar formato data URL
    let imageUrl = imageBase64;
    if (!imageUrl.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${imageUrl}`;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `
Eres un asistente experto en digitalización de planillas físicas y reconocimiento OCR industrial de planillas de firmas de ENDE DEORURO.
La imagen adjunta es una planilla de registro de RETIROS / CONSUMO DE BOTELLONES DE AGUA (20L) donde personas de diferentes áreas vienen a la oficina y firman al llevarse botellones.

Las áreas oficiales de la empresa son principalmente:
- ADMINISTRACIÓN
- RECURSOS HUMANOS
- COMERCIAL
- MANTENIMIENTO URBANO
- MANTENIMIENTO RURAL
- TRANSMISIÓN
- SALUD OCUPACIONAL
- SEGURIDAD INDUSTRIAL
- ALMACÉN / LOGÍSTICA
- MAESTRANZA / TALLER
- OPERACIONES / PLANTA

Cada fila de la planilla contiene típicamente:
1. Fecha (ej: 14/08/2026, 15-Ago, etc.)
2. Nombre y Apellido de la persona que retira el botellón
3. Área o Sector (empareja con una de las áreas oficiales de arriba siempre que sea posible)
4. Cantidad de botellones sacados (número entero positivo, comúnmente 1, 2, 3 o similar)
5. Firma o rúbrica de conformidad

INSTRUCCIONES CRÍTICAS:
- Extrae todas las filas que tengan un registro de entrega/retiro.
- Si la fecha no especifica año, usa el año actual (2026). Formato YYYY-MM-DD. Si no hay fecha legible en la fila, usa "${todayStr}".
- Normaliza los nombres y sectores en MAYÚSCULAS.
- Para "signaturePresent": pon true si hay un trazo, firma o rúbrica en la celda de firma; false si está vacía.
- Para "bottlesQuantity": número entero (si no está claro o no se especifica, por defecto 1).
- Devuelve EXCLUSIVAMENTE un bloque de código JSON con un array de objetos, sin explicaciones ni texto adicional.

Formato exacto esperado:
[
  {
    "withdrawalDate": "YYYY-MM-DD",
    "recipientName": "NOMBRE Y APELLIDO",
    "sector": "ÁREA O SECTOR",
    "bottlesQuantity": 1,
    "signaturePresent": true,
    "notes": ""
  }
]
`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error de API OpenCode Go Vision:', errText);
      return { 
        success: false, 
        error: `Error al conectar con la IA de reconocimiento: ${response.statusText}` 
      };
    }

    const resJson = await response.json();
    const rawContent = resJson.choices?.[0]?.message?.content || '';

    // Extraer JSON
    let cleanJsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIdx = cleanJsonStr.indexOf('[');
    const endIdx = cleanJsonStr.lastIndexOf(']');

    if (startIdx === -1 || endIdx === -1) {
      console.warn('La IA no devolvió un array JSON:', rawContent);
      return {
        success: false,
        error: 'No se pudieron detectar filas legibles en la planilla. Verifique que la imagen esté enfocada e iluminada.'
      };
    }

    cleanJsonStr = cleanJsonStr.substring(startIdx, endIdx + 1);
    const parsedRows = JSON.parse(cleanJsonStr);

    if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
      return {
        success: false,
        error: 'No se encontraron registros de retiros en la planilla analizada.'
      };
    }

    // Sanitizar filas
    const sanitizedItems: WaterWithdrawalInput[] = parsedRows.map((r: any) => ({
      withdrawalDate: r.withdrawalDate || todayStr,
      recipientName: (r.recipientName || 'PERSONAL NO IDENTIFICADO').trim().toUpperCase(),
      sector: (r.sector || 'GENERAL').trim().toUpperCase(),
      bottlesQuantity: Math.max(1, parseInt(r.bottlesQuantity, 10) || 1),
      signaturePresent: r.signaturePresent !== false,
      photoUrl: imageUrl,
      notes: r.notes || ''
    }));

    return {
      success: true,
      items: sanitizedItems,
      count: sanitizedItems.length
    };
  } catch (error: any) {
    console.error('Error en analyzeWaterDeliverySheet:', error);
    return {
      success: false,
      error: error.message || 'Error inesperado durante el reconocimiento OCR con IA.'
    };
  }
}
