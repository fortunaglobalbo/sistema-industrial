'use server';

import { supabase } from '@/lib/supabase';
import { 
  MedicineKitInput, 
  MedicineKitData, 
  PREDEFINED_KITS,
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

// Fallback en memoria si la tabla de asignaciones aún no se ejecutó en la base de datos
let inMemoryAssignments: KitAssignmentData[] = [
  {
    id: 'demo-1',
    kitId: null,
    kitName: 'Kit Básico de Primeros Auxilios',
    area: 'Subestación Central',
    locationDetails: 'Pared este, junto al tablero principal y extintor N° 02',
    responsibleName: 'Ing. Carlos Mendoza',
    responsibleCi: '3489123 Or.',
    responsiblePosition: 'Jefe de Subestación',
    assignedDate: '2026-08-15',
    nextRevisionDate: '2026-11-15',
    status: 'activo',
    observations: 'Botiquín metálico adosado a la pared con precinto de seguridad N° 104.',
    createdAt: new Date('2026-08-15T09:00:00Z').toISOString(),
  },
  {
    id: 'demo-2',
    kitId: null,
    kitName: 'Kit Botiquín Vehicular / Brigada Móvil',
    area: 'Móvil Cuadrilla Redes N° 3',
    locationDetails: 'Camioneta Toyota Hilux (Placa 4512-KLM) - Guantera / Cabina',
    responsibleName: 'Pedro Gutierrez Choque',
    responsibleCi: '5412987 Or.',
    responsiblePosition: 'Técnico Liniero / Conductor',
    assignedDate: '2026-09-01',
    nextRevisionDate: '2026-12-01',
    status: 'activo',
    observations: 'Maletín impermeable de primeros auxilios con kit completo.',
    createdAt: new Date('2026-09-01T08:30:00Z').toISOString(),
  },
  {
    id: 'demo-3',
    kitId: null,
    kitName: 'Kit Cuadrilla Técnica y Emergencias',
    area: 'Taller de Maestranza y Soldadura',
    locationDetails: 'Caseta de supervisión, estante de seguridad nivel 1',
    responsibleName: 'Mario Fernandez Lopez',
    responsibleCi: '2987451 Or.',
    responsiblePosition: 'Encargado de Taller',
    assignedDate: '2026-07-10',
    nextRevisionDate: '2026-10-10',
    status: 'activo',
    observations: 'Botiquín reforzado para área de soldadura y corte.',
    createdAt: new Date('2026-07-10T11:00:00Z').toISOString(),
  }
];

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
      if (existingId && !existingId.startsWith('demo-')) {
        const { error } = await supabase
          .from('assigned_medicine_kits')
          .update(payload)
          .eq('id', existingId);

        if (!error) return { success: true, id: existingId };
      } else if (!existingId) {
        const { data: record, error } = await supabase
          .from('assigned_medicine_kits')
          .insert([payload])
          .select()
          .single();

        if (!error && record) return { success: true, id: record.id };
      }
    } catch {
      // Fallback a memoria si la tabla no existe en Supabase
    }

    // Fallback de persistencia local / en memoria
    if (existingId) {
      const idx = inMemoryAssignments.findIndex(a => a.id === existingId);
      if (idx !== -1) {
        inMemoryAssignments[idx] = {
          ...inMemoryAssignments[idx],
          ...data,
          locationDetails: data.locationDetails || null,
          responsibleCi: data.responsibleCi || null,
          responsiblePosition: data.responsiblePosition || null,
          nextRevisionDate: data.nextRevisionDate || null,
          observations: data.observations || null
        };
        return { success: true, id: existingId };
      }
    }

    const newId = `assign-${Date.now()}`;
    const newRecord: KitAssignmentData = {
      id: newId,
      ...data,
      locationDetails: data.locationDetails || null,
      responsibleCi: data.responsibleCi || null,
      responsiblePosition: data.responsiblePosition || null,
      nextRevisionDate: data.nextRevisionDate || null,
      observations: data.observations || null,
      createdAt: new Date().toISOString(),
    };
    inMemoryAssignments.unshift(newRecord);
    return { success: true, id: newId };

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

    return inMemoryAssignments;
  } catch (error) {
    console.warn('Usando asignaciones de botiquines en memoria:', error);
    return inMemoryAssignments;
  }
}

/**
 * Eliminar una asignación de botiquín
 */
export async function deleteKitAssignment(id: string) {
  try {
    try {
      const { error } = await supabase
        .from('assigned_medicine_kits')
        .delete()
        .eq('id', id);

      if (!error) {
        inMemoryAssignments = inMemoryAssignments.filter(a => a.id !== id);
        return { success: true };
      }
    } catch {
      // Ignorar si tabla no existe
    }

    inMemoryAssignments = inMemoryAssignments.filter(a => a.id !== id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar asignación.' };
  }
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

