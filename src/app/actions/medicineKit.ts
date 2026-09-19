'use server';

import { supabase } from '@/lib/supabase';
import { 
  MedicineKitInput, 
  KitAssignmentInput,
  KitAssignmentData
} from '@/lib/medicineKitTypes';

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
      const { data: updated, error } = await supabase
        .from('medicine_kits')
        .update(payload)
        .eq('id', existingId)
        .select('id')
        .single();

      if (error || !updated) {
        return { success: false, error: 'No se confirmó la actualización del kit.' };
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
      throw new Error('No se pudo cargar el catálogo de botiquines.');
    }

    return data || [];
  } catch (error) {
    console.error('Error en getMedicineKits:', error);
    throw new Error('No se pudo cargar el catálogo de botiquines.');
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

/**
 * Guardar o actualizar la asignación de un botiquín por área y responsable
 */
export async function saveKitAssignment(data: KitAssignmentInput, existingId?: string) {
  try {
    if (!data.area || !data.area.trim()) {
      return { success: false, error: 'El nombre del área o ubicación es obligatorio.' };
    }
    if (!data.responsibleName || !data.responsibleName.trim()) {
      return { success: false, error: 'Debe ingresar el nombre del responsable custodio.' };
    }
    if (!data.kitName || !data.kitName.trim()) {
      return { success: false, error: 'Debe seleccionar el tipo de kit asignado.' };
    }

    const payload = {
      kit_id: data.kitId || null,
      kit_name: data.kitName.trim(),
      area: data.area.trim(),
      location_details: data.locationDetails ? data.locationDetails.trim() : null,
      responsible_name: data.responsibleName.trim(),
      responsible_ci: data.responsibleCi ? data.responsibleCi.trim() : null,
      responsible_position: data.responsiblePosition ? data.responsiblePosition.trim() : null,
      assigned_date: data.assignedDate || new Date().toISOString().split('T')[0],
      next_revision_date: data.nextRevisionDate || null,
      status: data.status || 'activo',
      observations: data.observations ? data.observations.trim() : null,
    };

    // Intentar en Supabase
    try {
      if (existingId) {
        const { data: updated, error } = await supabase
          .from('assigned_medicine_kits')
          .update(payload)
          .eq('id', existingId)
          .select('id')
          .single();

        if (!error && updated) return { success: true, id: existingId };
      } else if (!existingId) {
        const { data: record, error } = await supabase
          .from('assigned_medicine_kits')
          .insert([payload])
          .select()
          .single();

        if (!error && record) return { success: true, id: record.id };
      }
    } catch {
      // El error se informa sin simular persistencia.
    }

    return { success: false, error: 'No se guardó la asignación en la base de datos. Verifica la conexión y vuelve a intentar.' };

  } catch (error: any) {
    console.error('Error in saveKitAssignment:', error);
    return { success: false, error: error?.message || 'Error al guardar asignación.' };
  }
}

/**
 * Obtener todas las asignaciones de botiquines por área
 */
export async function getKitAssignments(): Promise<KitAssignmentData[]> {
  try {
    const { data, error } = await supabase
      .from('assigned_medicine_kits')
      .select('*')
      .order('assigned_date', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        kitId: d.kit_id,
        kitName: d.kit_name,
        area: d.area,
        locationDetails: d.location_details,
        responsibleName: d.responsible_name,
        responsibleCi: d.responsible_ci,
        responsiblePosition: d.responsible_position,
        assignedDate: d.assigned_date,
        nextRevisionDate: d.next_revision_date,
        status: d.status || 'activo',
        observations: d.observations,
        createdAt: d.created_at,
      }));
    }

    if (error) throw new Error('No se pudieron cargar las asignaciones de botiquines.');
    return [];
  } catch (error) {
    throw error;
  }
}

/**
 * Eliminar una asignación de botiquín
 */
export async function deleteKitAssignment(id: string) {
  try {
    const { data, error } = await supabase.from('assigned_medicine_kits').delete().eq('id', id).select('id').single();
    if (error || !data) return { success: false, error: 'No se confirmó la eliminación de la asignación.' };
    return { success: true };
  } catch { return { success: false, error: 'No se pudo eliminar la asignación.' }; }
}

/**
 * Resumen de botiquines asignados
 */
export async function getKitAssignmentSummary() {
  const list = await getKitAssignments();
  const total = list.length;
  const activos = list.filter(k => k.status === 'activo').length;
  const revision = list.filter(k => k.status === 'revision').length;
  const baja = list.filter(k => k.status === 'baja').length;

  return { total, activos, revision, baja };
}
