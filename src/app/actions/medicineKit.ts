'use server';

import { supabase } from '@/lib/supabase';
import { MedicineKitDeliveryInput, MedicineKitDeliveryData } from '@/lib/medicineKitTypes';

/**
 * Registrar una entrega de Kit de Medicamentos
 */
export async function createMedicineKitDelivery(data: MedicineKitDeliveryInput) {
  try {
    if (!data.kitName || !data.kitName.trim()) {
      return { success: false, error: 'El nombre del kit es obligatorio.' };
    }
    if (!data.recipientName || !data.recipientName.trim()) {
      return { success: false, error: 'El nombre de quien recibe el kit es obligatorio.' };
    }
    if (!data.recipientPosition || !data.recipientPosition.trim()) {
      return { success: false, error: 'El cargo o puesto es obligatorio.' };
    }
    if (!data.recipientArea || !data.recipientArea.trim()) {
      return { success: false, error: 'El área, cuadrilla o vehículo es obligatorio.' };
    }
    if (!data.deliveryDate) {
      return { success: false, error: 'La fecha de entrega es obligatoria.' };
    }
    if (!data.deliveredBy || !data.deliveredBy.trim()) {
      return { success: false, error: 'El nombre del responsable de entrega es obligatorio.' };
    }
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Debe incluir al menos un medicamento o insumo en el kit.' };
    }

    const payload = {
      kit_name: data.kitName.trim().toUpperCase(),
      recipient_name: data.recipientName.trim().toUpperCase(),
      recipient_ci: data.recipientCi ? data.recipientCi.trim().toUpperCase() : null,
      recipient_position: data.recipientPosition.trim().toUpperCase(),
      recipient_area: data.recipientArea.trim().toUpperCase(),
      delivery_date: data.deliveryDate,
      items: data.items,
      delivered_by: data.deliveredBy.trim().toUpperCase(),
      observations: data.observations ? data.observations.trim().toUpperCase() : null
    };

    const { data: record, error } = await supabase
      .from('medicine_kit_deliveries')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Error insertando en medicine_kit_deliveries:', error);
      return { success: false, error: `Error al registrar la entrega: ${error.message}` };
    }

    return { success: true, id: record.id, folio: record.folio };
  } catch (error: any) {
    console.error('Error in createMedicineKitDelivery:', error);
    return { success: false, error: error?.message || 'Error inesperado al registrar el kit de medicamentos.' };
  }
}

/**
 * Obtener historial de entregas de kits de medicamentos
 */
export async function getMedicineKitDeliveries(searchTerm?: string) {
  try {
    let query = supabase
      .from('medicine_kit_deliveries')
      .select('*')
      .order('delivery_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar medicine_kit_deliveries:', error);
      return [];
    }

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      return (data || []).filter((item: any) =>
        (item.recipient_name && item.recipient_name.toLowerCase().includes(term)) ||
        (item.kit_name && item.kit_name.toLowerCase().includes(term)) ||
        (item.recipient_area && item.recipient_area.toLowerCase().includes(term))
      );
    }

    return data || [];
  } catch (error) {
    console.error('Error en getMedicineKitDeliveries:', error);
    return [];
  }
}

/**
 * Eliminar una entrega de kit de medicamentos
 */
export async function deleteMedicineKitDelivery(id: string) {
  try {
    const { error } = await supabase
      .from('medicine_kit_deliveries')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar el registro.' };
  }
}
