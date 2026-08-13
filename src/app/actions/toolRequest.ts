'use server';

import { supabase } from '@/lib/supabase';

import { 
  ToolRequestInput, 
  ToolRequestData, 
  ToolRequestItemData 
} from '@/lib/toolRequestTypes';

/**
  Crear una nueva solicitud masiva de herramientas en Supabase
 */
export async function createToolRequest(data: ToolRequestInput) {
  try {
    if (!data.supervisorName || !data.supervisorName.trim()) {
      return { success: false, error: 'El nombre del supervisor es obligatorio.' };
    }
    if (!data.area || !data.area.trim()) {
      return { success: false, error: 'Debe seleccionar un Área Técnica.' };
    }
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Debe ingresar al menos una herramienta en el requerimiento.' };
    }

    const timestamp = Date.now().toString().slice(-4);
    const generatedCode = `REQ-${new Date().getFullYear()}-${timestamp}`;

    // Intentar insertar la cabecera en Supabase
    const { data: requestRecord, error: reqError } = await supabase
      .from('tool_requests')
      .insert([{
        request_code: generatedCode,
        supervisor_name: data.supervisorName.trim(),
        area: data.area.trim(),
        justification: (data.justification || '').trim(),
        priority: data.priority || 'Normal',
        status: 'Pendiente'
      }])
      .select()
      .single();

    if (reqError) {
      console.warn('Error insertando en Supabase (tool_requests):', reqError);
      return {
        success: false,
        error: `Error al guardar en Supabase: ${reqError.message || 'Verifique haber ejecutado el script SQL en Supabase SQL Editor.'}`
      };
    }

    const requestId = requestRecord.id;

    // Insertar cada ítem del requerimiento
    const itemsToInsert = data.items.map((item, index) => ({
      request_id: requestId,
      item_number: item.itemNumber || (index + 1),
      tool_type: item.toolType || 'Herramienta Manual',
      description: item.description.trim(),
      quantity: Number(item.quantity) || 1,
      area: item.area || data.area
    }));

    const { error: itemsError } = await supabase
      .from('tool_request_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.warn('Error insertando ítems de requerimiento:', itemsError);
    }

    return {
      success: true,
      requestId,
      folio: requestRecord.folio || requestId,
      requestCode: requestRecord.request_code || generatedCode
    };

  } catch (error: any) {
    console.error('Error in createToolRequest:', error);
    return {
      success: false,
      error: error?.message || 'Ocurrió un error inesperado al procesar la solicitud.'
    };
  }
}

/**
  Obtener historial de solicitudes de requerimientos de herramientas
 */
export async function getToolRequests(filterArea?: string) {
  try {
    let query = supabase
      .from('tool_requests')
      .select('*, tool_request_items(count)')
      .order('created_at', { ascending: false });

    if (filterArea && filterArea !== 'TODAS') {
      query = query.eq('area', filterArea);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error al obtener tool_requests:', error);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      folio: r.folio || 0,
      requestCode: r.request_code,
      supervisorName: r.supervisor_name,
      area: r.area,
      justification: r.justification,
      priority: r.priority,
      status: r.status,
      createdAt: r.created_at,
      itemCount: r.tool_request_items?.[0]?.count || 0
    }));

  } catch (err) {
    console.error('Error al consultar requerimientos de herramientas:', err);
    return [];
  }
}

/**
  Obtener detalles completos de una solicitud específica por ID
 */
export async function getToolRequestDetails(requestId: string) {
  try {
    const { data: request, error: reqError } = await supabase
      .from('tool_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return { success: false, error: 'No se encontró la solicitud de herramientas.' };
    }

    const { data: items, error: itemsError } = await supabase
      .from('tool_request_items')
      .select('*')
      .eq('request_id', requestId)
      .order('item_number', { ascending: true });

    if (itemsError) {
      console.warn('Error al obtener ítems:', itemsError);
    }

    const formattedRequest: ToolRequestData = {
      id: request.id,
      folio: request.folio,
      requestCode: request.request_code,
      supervisorName: request.supervisor_name,
      area: request.area,
      justification: request.justification,
      priority: request.priority,
      status: request.status,
      createdAt: request.created_at
    };

    const formattedItems: ToolRequestItemData[] = (items || []).map((i: any) => ({
      id: i.id,
      requestId: i.request_id,
      itemNumber: i.item_number,
      toolType: i.tool_type,
      description: i.description,
      quantity: Number(i.quantity),
      area: i.area,
      createdAt: i.created_at
    }));

    return {
      success: true,
      request: formattedRequest,
      items: formattedItems
    };

  } catch (err: any) {
    console.error('Error in getToolRequestDetails:', err);
    return { success: false, error: err?.message || 'Error al obtener los detalles del requerimiento.' };
  }
}

/**
  Actualizar estado de un requerimiento (Pendiente, En Revisión, Aprobado, Rechazado)
 */
export async function updateToolRequestStatus(requestId: string, status: string) {
  try {
    const { error } = await supabase
      .from('tool_requests')
      .update({ status })
      .eq('id', requestId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
  Eliminar un requerimiento de herramientas
 */
export async function deleteToolRequest(requestId: string) {
  try {
    const { error } = await supabase
      .from('tool_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
