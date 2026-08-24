'use server';

import { supabase } from '@/lib/supabase';
import { OfficialCiteInput, OfficialCiteData } from '@/lib/citeTypes';

/**
 * Registrar o actualizar un CITE en Supabase
 */
export async function saveOfficialCite(data: OfficialCiteInput, existingId?: string) {
  try {
    if (!data.issueDate) {
      return { success: false, error: 'La fecha es obligatoria.' };
    }
    if (!data.docNumber || !data.docNumber.trim()) {
      return { success: false, error: 'El número de documento / CITE es obligatorio.' };
    }
    if (!data.reference || !data.reference.trim()) {
      return { success: false, error: 'La referencia / asunto es obligatoria.' };
    }
    if (!data.recipientA || !data.recipientA.trim()) {
      return { success: false, error: 'El campo "A" (Destinatario / Gerencia) es obligatorio.' };
    }
    if (!data.signerFirm || !data.signerFirm.trim()) {
      return { success: false, error: 'El campo "Firma / Remitente" es obligatorio.' };
    }

    const payload = {
      issue_date: data.issueDate,
      doc_number: data.docNumber.trim().toUpperCase(),
      reference: data.reference.trim().toUpperCase(),
      recipient_a: data.recipientA.trim().toUpperCase(),
      signer_firm: data.signerFirm.trim().toUpperCase(),
      status: data.status || 'Enviado',
      observations: data.observations ? data.observations.trim().toUpperCase() : null
    };

    if (existingId) {
      const { error } = await supabase
        .from('official_cites')
        .update(payload)
        .eq('id', existingId);

      if (error) {
        return { success: false, error: `Error al actualizar: ${error.message}` };
      }
      return { success: true, id: existingId };
    } else {
      const { data: record, error } = await supabase
        .from('official_cites')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn('Error insertando en official_cites:', error);
        return { success: false, error: `Error al guardar: ${error.message}` };
      }
      return { success: true, id: record.id };
    }

  } catch (error: any) {
    console.error('Error in saveOfficialCite:', error);
    return { success: false, error: error?.message || 'Error inesperado al guardar el CITE.' };
  }
}

/**
 * Obtener todos los CITEs registrados con filtros
 */
export async function getOfficialCites(searchTerm?: string, filterStatus?: string) {
  try {
    let query = supabase
      .from('official_cites')
      .select('*')
      .order('correlative_number', { ascending: false });

    if (filterStatus && filterStatus !== 'TODOS') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al consultar official_cites:', error);
      return [];
    }

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      return (data || []).filter((item: any) => 
        (item.doc_number && item.doc_number.toLowerCase().includes(term)) ||
        (item.reference && item.reference.toLowerCase().includes(term)) ||
        (item.recipient_a && item.recipient_a.toLowerCase().includes(term)) ||
        (item.signer_firm && item.signer_firm.toLowerCase().includes(term))
      );
    }

    return data || [];
  } catch (error) {
    console.error('Error en getOfficialCites:', error);
    return [];
  }
}

/**
 * Eliminar un CITE
 */
export async function deleteOfficialCite(id: string) {
  try {
    const { error } = await supabase
      .from('official_cites')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar el CITE.' };
  }
}
