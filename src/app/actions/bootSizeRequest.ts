'use server';

import { supabase } from '@/lib/supabase';
import { BootSizeRequestInput, BootSizeRequestData } from '@/lib/bootSizeTypes';

/**
 * Registrar una nueva talla de botín en Supabase
 */
export async function createBootSizeRequest(data: BootSizeRequestInput) {
  try {
    if (!data.fullName || !data.fullName.trim()) {
      return { success: false, error: 'El Nombre Completo es obligatorio.' };
    }
    if (!data.area || !data.area.trim()) {
      return { success: false, error: 'Debe seleccionar un Área / Departamento.' };
    }
    if (!data.position || !data.position.trim()) {
      return { success: false, error: 'El Cargo / Puesto es obligatorio.' };
    }
    if (!data.gender || !['MASCULINO', 'FEMENINO'].includes(data.gender.toUpperCase())) {
      return { success: false, error: 'Debe seleccionar el Género (Masculino o Femenino).' };
    }
    if (!data.bootSize || data.bootSize < 35 || data.bootSize > 45) {
      return { success: false, error: 'Debe seleccionar una talla de botín válida entre 35 y 45.' };
    }

    const timestamp = Date.now().toString().slice(-4);
    const generatedCode = `BOT-${new Date().getFullYear()}-${timestamp}`;

    const payload = {
      registration_code: generatedCode,
      full_name: data.fullName.trim().toUpperCase(),
      area: data.area.trim().toUpperCase(),
      position: data.position.trim().toUpperCase(),
      gender: data.gender.trim().toUpperCase(),
      boot_size: Number(data.bootSize),
      status: 'Registrado'
    };

    const { data: record, error } = await supabase
      .from('boot_size_requests')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Error insertando en Supabase (boot_size_requests):', error);
      return {
        success: false,
        error: `Error al guardar en Supabase: ${error.message || 'Verifique haber ejecutado el script SQL en Supabase.'}`
      };
    }

    return {
      success: true,
      id: record.id,
      folio: record.folio || record.id,
      registrationCode: record.registration_code || generatedCode
    };

  } catch (error: any) {
    console.error('Error in createBootSizeRequest:', error);
    return {
      success: false,
      error: error?.message || 'Ocurrió un error inesperado al guardar la talla de botín.'
    };
  }
}

/**
 * Obtener historial de registros de tallas de botines
 */
export async function getBootSizeRequests(filterArea?: string, filterGender?: string) {
  try {
    let query = supabase
      .from('boot_size_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterArea && filterArea !== 'TODAS') {
      query = query.eq('area', filterArea);
    }

    if (filterGender && filterGender !== 'TODOS') {
      query = query.eq('gender', filterGender);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar boot_size_requests:', error);
      return [];
    }

    return data as BootSizeRequestData[];
  } catch (error) {
    console.error('Error en getBootSizeRequests:', error);
    return [];
  }
}

/**
 * Eliminar un registro de talla de botín
 */
export async function deleteBootSizeRequest(id: string) {
  try {
    const { error } = await supabase
      .from('boot_size_requests')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar el registro.' };
  }
}

/**
 * Generar reporte consolidado de requerimiento de botines por tallas (para almacén)
 */
export async function getConsolidatedBootReport(filterArea?: string) {
  try {
    let query = supabase
      .from('boot_size_requests')
      .select('boot_size, gender, area');

    if (filterArea && filterArea !== 'TODAS') {
      query = query.eq('area', filterArea);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener reporte consolidado de botines:', error);
      return { success: false, error: error.message, summary: [] };
    }

    // Agrupar por talla (35 - 45)
    const summaryMap: Record<number, { size: number; masculino: number; femenino: number; total: number }> = {};

    for (let s = 35; s <= 45; s++) {
      summaryMap[s] = { size: s, masculino: 0, femenino: 0, total: 0 };
    }

    (data || []).forEach((row: any) => {
      const s = Number(row.boot_size);
      if (summaryMap[s]) {
        summaryMap[s].total += 1;
        if (row.gender === 'MASCULINO') summaryMap[s].masculino += 1;
        if (row.gender === 'FEMENINO') summaryMap[s].femenino += 1;
      }
    });

    const summaryList = Object.values(summaryMap);
    const grandTotal = summaryList.reduce((acc, curr) => acc + curr.total, 0);

    return {
      success: true,
      totalPairs: grandTotal,
      summary: summaryList,
      recordsCount: data ? data.length : 0
    };

  } catch (error: any) {
    console.error('Error en getConsolidatedBootReport:', error);
    return { success: false, error: error?.message || 'Error al calcular consolidado.', summary: [] };
  }
}
