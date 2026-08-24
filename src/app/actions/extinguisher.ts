'use server';

import { supabase } from '@/lib/supabase';
import { FireExtinguisherInput, FireExtinguisherData } from '@/lib/extinguisherTypes';

/**
 * Registrar o actualizar un extintor en Supabase
 */
export async function saveExtinguisher(data: FireExtinguisherInput, existingId?: string) {
  try {
    if (!data.code || !data.code.trim()) {
      return { success: false, error: 'El código del extintor es obligatorio (Ej. EXT-01).' };
    }
    if (!data.location || !data.location.trim()) {
      return { success: false, error: 'La ubicación del extintor es obligatoria.' };
    }
    if (!data.lastRechargeDate) {
      return { success: false, error: 'La fecha de última recarga es obligatoria.' };
    }
    if (!data.expirationDate) {
      return { success: false, error: 'La fecha de próximo vencimiento es obligatoria.' };
    }

    const payload = {
      code: data.code.trim().toUpperCase(),
      location: data.location.trim().toUpperCase(),
      agent_type: data.agentType || 'PQS (Polvo Químico Seco ABC)',
      capacity: data.capacity || '6 kg',
      last_recharge_date: data.lastRechargeDate,
      expiration_date: data.expirationDate,
      pressure_status: data.pressureStatus || 'Correcto (En Verde)',
      seal_status: data.sealStatus || 'Intacto',
      hose_status: data.hoseStatus || 'Buen Estado',
      signage_status: data.signageStatus || 'Visible y Reglamentaria',
      observations: data.observations ? data.observations.trim().toUpperCase() : null,
      inspector_name: data.inspectorName ? data.inspectorName.trim().toUpperCase() : null
    };

    if (existingId) {
      const { error } = await supabase
        .from('fire_extinguishers')
        .update(payload)
        .eq('id', existingId);

      if (error) {
        return { success: false, error: `Error al actualizar: ${error.message}` };
      }
      return { success: true, id: existingId };
    } else {
      const { data: record, error } = await supabase
        .from('fire_extinguishers')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Ya existe un extintor registrado con ese mismo Código.' };
        }
        return { success: false, error: `Error al guardar: ${error.message}` };
      }
      return { success: true, id: record.id };
    }

  } catch (error: any) {
    console.error('Error in saveExtinguisher:', error);
    return { success: false, error: error?.message || 'Error inesperado al procesar el extintor.' };
  }
}

/**
 * Obtener todos los extintores con cálculo de estado en tiempo real
 */
export async function getExtinguishers(filterLocation?: string, filterStatus?: string) {
  try {
    let query = supabase
      .from('fire_extinguishers')
      .select('*')
      .order('code', { ascending: true });

    if (filterLocation && filterLocation !== 'TODAS') {
      query = query.ilike('location', `%${filterLocation}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar fire_extinguishers:', error);
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = (data || []).map((item: any) => {
      const expDate = new Date(item.expiration_date + 'T00:00:00');
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let calculatedStatus: 'Vigente' | 'Por Vencer' | 'Vencido' = 'Vigente';
      if (diffDays < 0) {
        calculatedStatus = 'Vencido';
      } else if (diffDays <= 30) {
        calculatedStatus = 'Por Vencer';
      }

      return {
        ...item,
        daysToExpiration: diffDays,
        calculatedStatus
      };
    });

    if (filterStatus && filterStatus !== 'TODOS') {
      return enriched.filter((item: any) => item.calculatedStatus === filterStatus);
    }

    return enriched;
  } catch (error) {
    console.error('Error en getExtinguishers:', error);
    return [];
  }
}

/**
 * Eliminar un extintor
 */
export async function deleteExtinguisher(id: string) {
  try {
    const { error } = await supabase
      .from('fire_extinguishers')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar el extintor.' };
  }
}

/**
 * Obtener estadísticas globales de extintores para el semáforo
 */
export async function getExtinguisherSummary() {
  try {
    const all = await getExtinguishers();
    const total = all.length;
    const vigentes = all.filter((e: any) => e.calculatedStatus === 'Vigente').length;
    const porVencer = all.filter((e: any) => e.calculatedStatus === 'Por Vencer').length;
    const vencidos = all.filter((e: any) => e.calculatedStatus === 'Vencido').length;

    return {
      total,
      vigentes,
      porVencer,
      vencidos
    };
  } catch (error) {
    return { total: 0, vigentes: 0, porVencer: 0, vencidos: 0 };
  }
}
