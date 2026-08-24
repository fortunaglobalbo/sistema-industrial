'use server';

import { supabase } from '@/lib/supabase';
import { MedicineKitInput, MedicineKitData, PREDEFINED_KITS } from '@/lib/medicineKitTypes';

/**
 * Guardar o actualizar un Kit de Medicamentos (Plantilla / Armado)
 */
export async function saveMedicineKit(data: MedicineKitInput, existingId?: string) {
  try {
    if (!data.name || !data.name.trim()) {
      return { success: false, error: 'El nombre del kit es obligatorio.' };
    }
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Debe incluir al menos un medicamento o insumo en el kit.' };
    }

    const payload = {
      name: data.name.trim().toUpperCase(),
      description: data.description ? data.description.trim() : null,
      items: data.items
    };

    if (existingId) {
      const { error } = await supabase
        .from('medicine_kits')
        .update(payload)
        .eq('id', existingId);

      if (error) {
        return { success: false, error: `Error al actualizar: ${error.message}` };
      }
      return { success: true, id: existingId };
    } else {
      const { data: record, error } = await supabase
        .from('medicine_kits')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Ya existe un kit registrado con ese mismo nombre.' };
        }
        return { success: false, error: `Error al guardar el kit: ${error.message}` };
      }
      return { success: true, id: record.id };
    }

  } catch (error: any) {
    console.error('Error in saveMedicineKit:', error);
    return { success: false, error: error?.message || 'Error inesperado al guardar el kit.' };
  }
}

/**
 * Obtener todos los Kits de Medicamentos configurados
 */
export async function getMedicineKits() {
  try {
    let { data, error } = await supabase
      .from('medicine_kits')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error consultando medicine_kits:', error);
      return PREDEFINED_KITS.map((k, idx) => ({
        id: `mock-${idx}`,
        name: k.name,
        description: k.description || null,
        items: k.items,
        created_at: new Date().toISOString()
      })) as MedicineKitData[];
    }

    // Si la tabla está vacía en Supabase, inicializar con los kits predefinidos
    if (!data || data.length === 0) {
      for (const tpl of PREDEFINED_KITS) {
        await supabase.from('medicine_kits').insert([{
          name: tpl.name.toUpperCase(),
          description: tpl.description,
          items: tpl.items
        }]);
      }
      const res = await supabase.from('medicine_kits').select('*').order('name', { ascending: true });
      return res.data || [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getMedicineKits:', error);
    return [];
  }
}

/**
 * Eliminar un Kit de Medicamentos
 */
export async function deleteMedicineKit(id: string) {
  try {
    const { error } = await supabase
      .from('medicine_kits')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar el kit.' };
  }
}
