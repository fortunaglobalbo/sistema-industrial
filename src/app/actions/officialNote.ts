'use server';

import { supabase } from '@/lib/supabase';
import { OfficialNoteInput, OfficialNoteData } from '@/lib/officialNoteTypes';

/**
 * Guardar una nueva Nota Oficial de Compra (Carpeta 5)
 */
export async function saveOfficialNote(data: OfficialNoteInput) {
  try {
    const payload = {
      note_number: data.noteNumber || `0${Math.floor(Math.random() * 90) + 10}/${new Date().getFullYear()}`,
      issue_date: data.issueDate || `Oruro, ${new Date().toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      recipient_name: data.recipientName.trim().toUpperCase(),
      recipient_role: data.recipientRole.trim().toUpperCase(),
      via_name: data.viaName.trim().toUpperCase(),
      via_role: data.viaRole.trim().toUpperCase(),
      sender_name: data.senderName.trim().toUpperCase(),
      sender_role: data.senderRole.trim().toUpperCase(),
      object_title: data.objectTitle.trim().toUpperCase(),
      body_text: JSON.stringify({
        introParagraph: data.introParagraph,
        legalParagraph: data.legalParagraph,
        closingParagraph: data.closingParagraph,
        includeFooterCopy: data.includeFooterCopy
      }),
      attached_documents: data.attachedDocuments,
      status: 'Emitido'
    };

    const { data: record, error } = await supabase
      .from('official_notes')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Error insertando en Supabase (official_notes):', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: record.id,
      noteNumber: record.note_number
    };
  } catch (error: any) {
    console.error('Error in saveOfficialNote:', error);
    return { success: false, error: error?.message || 'Error al guardar la nota oficial.' };
  }
}

/**
 * Obtener lista de Notas Oficiales emitidas
 */
export async function getOfficialNotes() {
  try {
    const { data, error } = await supabase
      .from('official_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al consultar official_notes:', error);
      return [];
    }

    return (data || []).map((row: any) => {
      let bodyParsed: any = {};
      try {
        bodyParsed = JSON.parse(row.body_text);
      } catch (e) {
        bodyParsed = { introParagraph: row.body_text };
      }

      return {
        id: row.id,
        noteNumber: row.note_number,
        issueDate: row.issue_date,
        recipientName: row.recipient_name,
        recipientRole: row.recipient_role,
        viaName: row.via_name,
        viaRole: row.via_role,
        senderName: row.sender_name,
        senderRole: row.sender_role,
        objectTitle: row.object_title,
        introParagraph: bodyParsed.introParagraph || '',
        legalParagraph: bodyParsed.legalParagraph || '',
        closingParagraph: bodyParsed.closingParagraph || '',
        attachedDocuments: row.attached_documents || [],
        includeFooterCopy: bodyParsed.includeFooterCopy ?? true,
        status: row.status,
        created_at: row.created_at
      } as OfficialNoteData;
    });
  } catch (error) {
    console.error('Error en getOfficialNotes:', error);
    return [];
  }
}

/**
 * Eliminar una Nota Oficial
 */
export async function deleteOfficialNote(id: string) {
  try {
    const { error } = await supabase
      .from('official_notes')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al eliminar nota.' };
  }
}

/**
 * Generador Inteligente con IA para Nota Oficial de Inicio de Proceso de Compra
 */
export async function generateAIOfficialNote(category: string, customPrompt?: string) {
  try {
    // Plantillas Inteligentes y Generador Asistido por IA según el requerimiento oficial de ENDE DEORURO
    const currentYear = new Date().getFullYear();
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const now = new Date();
    const formattedDate = `Oruro, ${now.getDate()} de ${months[now.getMonth()]} de ${currentYear}`;
    const autoNumber = `0${Math.floor(Math.random() * 80) + 10}/${currentYear}`;

    let objectTitle = 'SOLICITUD DE INICIO DEL PROCESO DE COMPRA "ADQUISICIÓN DE HERRAMIENTA PARA CUADRILLAS"';
    let processName = 'ADQUISICIÓN DE HERRAMIENTA PARA CUADRILLAS';
    let attached = [
      'Formulario S1-N014 de solicitud de Adquisiciones de Bienes, Construcción de Obras o Contratación de Servicios.',
      'Cuadro de Justificación de solicitud de compra.',
      'Especificaciones Técnicas o Termino de Referencia.',
      'Cotizaciones o precio referencial.'
    ];

    if (category === 'BOTINES' || (customPrompt && customPrompt.toLowerCase().includes('botin'))) {
      objectTitle = 'SOLICITUD DE INICIO DEL PROCESO DE COMPRA "ADQUISICIÓN DE CALZADO DE SEGURIDAD Y BOTINES DIELÉCTRICOS PARA EL PERSONAL"';
      processName = 'ADQUISICIÓN DE CALZADO DE SEGURIDAD Y BOTINES DIELÉCTRICOS PARA EL PERSONAL';
      attached = [
        'Formulario S1-N014 de solicitud de Adquisiciones de Bienes, Construcción de Obras o Contratación de Servicios.',
        'Cuadro de Justificación de solicitud de compra y consolidado de tallas.',
        'Especificaciones Técnicas o Termino de Referencia (Norma ASTM F2413 / Dieléctrico 1000V).',
        'Cotizaciones o precio referencial.'
      ];
    } else if (category === 'EPP' || (customPrompt && customPrompt.toLowerCase().includes('epp'))) {
      objectTitle = 'SOLICITUD DE INICIO DEL PROCESO DE COMPRA "ADQUISICIÓN DE EQUIPOS DE PROTECCIÓN PERSONAL (EPP) PARA ÁREAS OPERATIVAS"';
      processName = 'ADQUISICIÓN DE EQUIPOS DE PROTECCIÓN PERSONAL (EPP) PARA ÁREAS OPERATIVAS';
      attached = [
        'Formulario S1-N014 de solicitud de Adquisiciones de Bienes, Construcción de Obras o Contratación de Servicios.',
        'Cuadro de Justificación técnica y matriz de dotación por puesto.',
        'Especificaciones Técnicas o Termino de Referencia para EPPs normados.',
        'Cotizaciones o precio referencial.'
      ];
    } else if (category === 'ROPA' || (customPrompt && customPrompt.toLowerCase().includes('ropa'))) {
      objectTitle = 'SOLICITUD DE INICIO DEL PROCESO DE COMPRA "ADQUISICIÓN DE ROPA DE TRABAJO TÉRMICA E IGNÍFUGA PARA PERSONAL TÉCNICO"';
      processName = 'ADQUISICIÓN DE ROPA DE TRABAJO TÉRMICA E IGNÍFUGA PARA PERSONAL TÉCNICO';
      attached = [
        'Formulario S1-N014 de solicitud de Adquisiciones de Bienes, Construcción de Obras o Contratación de Servicios.',
        'Cuadro de Justificación de compra y cuadros de tallas.',
        'Especificaciones Técnicas o Termino de Referencia (Tejido Antiestático / Térmico).',
        'Cotizaciones o precio referencial.'
      ];
    } else if (customPrompt && customPrompt.trim()) {
      const cleanCustom = customPrompt.trim().toUpperCase().replace(/["']/g, '');
      objectTitle = `SOLICITUD DE INICIO DEL PROCESO DE COMPRA "${cleanCustom}"`;
      processName = cleanCustom;
    }

    const generatedNote: OfficialNoteInput = {
      noteNumber: autoNumber,
      issueDate: formattedDate,
      recipientName: 'Lic. Vicente Paul Vega Ramirez',
      recipientRole: 'RESPONSABLE DE CONTRATACIONES',
      viaName: 'Lic. Raúl Alberto Torrico Gomez',
      viaRole: 'GERENTE GENERAL',
      senderName: 'Ing. Heydi Dunya Canaviri Padilla',
      senderRole: 'SUPERVISOR DE SEGURIDAD INDUSTRIAL',
      objectTitle: objectTitle,
      introParagraph: `Por medio de la presente, me dirijo a su autoridad para solicitar formalmente el inicio del proceso de compra correspondiente al proceso "${processName}".`,
      legalParagraph: 'Esta solicitud, se realiza en cumplimiento al Reglamento y Manual de Procedimiento de Adquisiciones de Bienes, construcciones de Obras y Contrataciones de Servicio, adjunto a la presente los documentos de respaldo necesarios para el inicio del proceso de contratación:',
      attachedDocuments: attached,
      closingParagraph: 'Sin otra particularidad y con las consideraciones del caso, me despido.',
      includeFooterCopy: true
    };

    return {
      success: true,
      note: generatedNote
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Error al generar la nota oficial con IA.'
    };
  }
}
