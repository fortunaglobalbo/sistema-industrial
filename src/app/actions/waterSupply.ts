'use server';

import { supabase } from '@/lib/supabase';
import { WaterSupplyInput, WaterSupplyData } from '@/lib/waterSupplyTypes';

/**
 * Registrar una entrega semanal de agua
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
      supplier_name: (data.supplierName || 'EMPRESA PROVEEDORA DE AGUA').trim().toUpperCase(),
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

    if (monthYear) {
      // Filtrar por año y mes YYYY-MM
      query = query.gte('delivery_date', `${monthYear}-01`).lte('delivery_date', `${monthYear}-31`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar water_supplies:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      ...item,
      difference: item.bottles_received - item.bottles_contracted
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
 * Obtener consolidado mensual de auditoría de agua para conformidad de contrato
 */
export async function getWaterMonthlySummary(monthYear?: string) {
  try {
    const data = await getWaterDeliveries(monthYear);
    const totalReceived = data.reduce((acc, curr: any) => acc + (curr.bottles_received || 0), 0);
    const totalContracted = data.reduce((acc, curr: any) => acc + (curr.bottles_contracted || 0), 0);
    const totalDifference = totalReceived - totalContracted;
    const deliveriesCount = data.length;

    return {
      success: true,
      totalReceived,
      totalContracted,
      totalDifference,
      deliveriesCount,
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
