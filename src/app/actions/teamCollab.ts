'use server';

import { supabase } from '@/lib/supabase';

export interface ChatMessageRecord {
  id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export interface TeamTaskRecord {
  id: string;
  title: string;
  scheduled_date: string;
  responsible: string;
  category: string;
  priority: string;
  notes: string;
  completed: boolean;
  created_by?: string;
  created_at: string;
}

/**
 * Obtener los últimos mensajes de chat del equipo (Tatiana, Gabriela, Paola)
 */
export async function getTeamChatMessages(limit = 60) {
  try {
    const { data, error } = await supabase
      .from('team_chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.warn('Advertencia al consultar team_chat_messages en Supabase:', error.message);
      return { success: false, data: [] as ChatMessageRecord[], error: error.message };
    }

    return { success: true, data: (data || []) as ChatMessageRecord[] };
  } catch (err: any) {
    console.error('Error al obtener mensajes de chat:', err);
    return { success: false, data: [] as ChatMessageRecord[], error: err?.message || 'Error desconocido' };
  }
}

/**
 * Enviar un mensaje de chat entre el equipo
 */
export async function sendTeamChatMessage(senderName: string, senderRole: string, message: string) {
  try {
    if (!message || !message.trim()) {
      return { success: false, error: 'El mensaje no puede estar vacío.' };
    }

    const { data, error } = await supabase
      .from('team_chat_messages')
      .insert([
        {
          sender_name: senderName.trim(),
          sender_role: senderRole.trim(),
          message: message.trim()
        }
      ])
      .select()
      .single();

    if (error) {
      console.warn('Advertencia al insertar en team_chat_messages:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ChatMessageRecord };
  } catch (err: any) {
    console.error('Error al enviar mensaje de chat:', err);
    return { success: false, error: err?.message || 'Error desconocido' };
  }
}

/**
 * Limpiar todo el historial de mensajes de chat
 */
export async function clearTeamChatHistory() {
  try {
    const { error } = await supabase
      .from('team_chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.warn('Advertencia al limpiar team_chat_messages en Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al limpiar chat:', err);
    return { success: false, error: err?.message || 'Error desconocido' };
  }
}

/**
 * Obtener tareas/avisos del cronograma desde Supabase
 */
export async function getTeamTasks() {
  try {
    const { data, error } = await supabase
      .from('team_tasks')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.warn('Advertencia al consultar team_tasks en Supabase:', error.message);
      return { success: false, data: [] as TeamTaskRecord[], error: error.message };
    }

    return { success: true, data: (data || []) as TeamTaskRecord[] };
  } catch (err: any) {
    console.error('Error al obtener tareas del equipo:', err);
    return { success: false, data: [] as TeamTaskRecord[], error: err?.message || 'Error desconocido' };
  }
}

/**
 * Crear una nueva tarea o aviso en el cronograma
 */
export async function createTeamTask(task: {
  title: string;
  scheduled_date: string;
  responsible: string;
  category: string;
  priority: string;
  notes?: string;
  created_by?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('team_tasks')
      .insert([
        {
          title: task.title.trim(),
          scheduled_date: task.scheduled_date,
          responsible: task.responsible.trim(),
          category: task.category.trim(),
          priority: task.priority,
          notes: task.notes ? task.notes.trim() : '',
          completed: false,
          created_by: task.created_by || 'Equipo'
        }
      ])
      .select()
      .single();

    if (error) {
      console.warn('Advertencia al insertar en team_tasks:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as TeamTaskRecord };
  } catch (err: any) {
    console.error('Error al crear tarea de equipo:', err);
    return { success: false, error: err?.message || 'Error desconocido' };
  }
}

/**
 * Alternar estado de completado de una tarea
 */
export async function toggleTeamTaskComplete(id: string, completed: boolean) {
  try {
    const { error } = await supabase
      .from('team_tasks')
      .update({ completed })
      .eq('id', id);

    if (error) {
      console.warn('Advertencia al actualizar team_tasks:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al alternar tarea:', err);
    return { success: false, error: err?.message || 'Error desconocido' };
  }
}

/**
 * Eliminar una tarea del cronograma
 */
export async function deleteTeamTask(id: string) {
  try {
    const { error } = await supabase
      .from('team_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Advertencia al eliminar en team_tasks:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al eliminar tarea:', err);
    return { success: false, error: err?.message || 'Error desconocido' };
  }
}

/**
 * Obtener las actas de reunión semanal del equipo
 */
export async function getTeamMeetingMinutes() {
  try {
    const { data, error } = await supabase
      .from('team_meeting_minutes')
      .select('*')
      .order('meeting_date', { ascending: false });

    if (error) {
      console.warn('Advertencia al consultar team_meeting_minutes:', error.message);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('Error al obtener actas de reunión:', err);
    return { success: false, data: [], error: err?.message || 'Error desconocido' };
  }
}

/**
 * Guardar o crear un acta de reunión semanal
 */
export async function saveTeamMeetingMinute(minute: {
  id?: string;
  correlative_number: string;
  meeting_date: string;
  start_time?: string;
  title: string;
  attendees: string[];
  agenda_topics: string;
  agreements: Array<{ task: string; responsible: string; deadline: string }>;
  notes?: string;
  created_by?: string;
}) {
  try {
    const payload = {
      correlative_number: minute.correlative_number.trim(),
      meeting_date: minute.meeting_date,
      start_time: minute.start_time || '08:30',
      title: minute.title.trim(),
      attendees: minute.attendees,
      agenda_topics: minute.agenda_topics.trim(),
      agreements: minute.agreements,
      notes: minute.notes ? minute.notes.trim() : '',
      created_by: minute.created_by || 'Tatiana Torres'
    };

    let result;
    if (minute.id) {
      result = await supabase
        .from('team_meeting_minutes')
        .update(payload)
        .eq('id', minute.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('team_meeting_minutes')
        .insert([payload])
        .select()
        .single();
    }

    if (result.error) {
      console.warn('Advertencia al guardar acta de reunión:', result.error.message);
      return { success: false, error: result.error.message };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    console.error('Error al guardar acta:', err);
    return { success: false, error: err?.message || 'Error desconocido' };
  }
}

/**
 * Eliminar un acta de reunión semanal
 */
export async function deleteTeamMeetingMinute(id: string) {
  try {
    const { error } = await supabase
      .from('team_meeting_minutes')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Advertencia al eliminar acta:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error al eliminar acta:', err);
    return { success: false, error: err?.message || 'Error desconocido' };
  }
}

/**
 * Analizar notas libres de la reunión con Inteligencia Artificial
 * y extraer automáticamente la agenda, los compromisos y responsables
 */
export async function analyzeMeetingNotesWithAI(rawText: string, meetingDate: string) {
  try {
    if (!rawText || !rawText.trim()) {
      return { success: false, error: 'Por favor ingrese las notas o el resumen de la reunión para analizar con IA.' };
    }

    const apiKey = process.env.OPENCODE_GO_API_KEY || 'sk-uiqURVX900evBUHKomZL4LjIe3L1NvILaNAcATY4oZ6rWvDMoVAt9ODP3F6Q8g97';
    const baseUrl = process.env.OPENCODE_GO_BASE_URL || 'https://opencode.ai/zen/go/v1';
    const model = process.env.OPENCODE_GO_MODEL || 'deepseek-v4-flash-vision-exp';

    const prompt = `
Eres un asistente de Inteligencia Artificial para el área de Seguridad Industrial y Salud Ocupacional de ENDE DEORURO.
Tu tarea es analizar las siguientes notas informales, dictadas o en borrador de la reunión de coordinación de los lunes entre las integrantes del equipo:
- Tatiana Torres
- Gabriela
- Paola

Fecha de la reunión: ${meetingDate}

Texto de la reunión:
"""
${rawText}
"""

Analiza el texto y genera una estructura ejecutiva y profesional con los compromisos asignados.
Debes devolver EXCLUSIVAMENTE un bloque de código JSON con este formato exacto:
{
  "title": "Título formal de la reunión (ej: Planificación Semanal de Inspecciones y Suministros)",
  "agenda_topics": "1. Primer tema tratado\\n2. Segundo tema tratado\\n3. Tercer tema tratado",
  "attendees": ["Tatiana Torres", "Gabriela", "Paola"],
  "agreements": [
    {
      "task": "Descripción clara y accionable de la tarea asignada",
      "responsible": "Tatiana Torres | Gabriela | Paola | Todas / Equipo",
      "deadline": "YYYY-MM-DD"
    }
  ],
  "notes": "Observaciones o recomendaciones generales de coordinación"
}

REGLAS OBLIGATORIAS:
- Los únicos nombres válidos para "responsible" son: "Tatiana Torres", "Gabriela", "Paola" o "Todas / Equipo".
- Para las fechas límites ("deadline"), si el texto dice "mañana", "martes", "miércoles", "el viernes" o similar, calcula la fecha correcta a partir de la fecha de reunión (${meetingDate}) en formato YYYY-MM-DD.
- Devuelve únicamente el objeto JSON sin introducciones ni comentarios adicionales.
`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      console.warn('Fallo en API IA OpenCode Go:', response.statusText);
      return runSmartFallbackAnalysis(rawText, meetingDate);
    }

    const resJson = await response.json();
    const rawContent = resJson.choices?.[0]?.message?.content || '';

    // Extraer y parsear JSON
    let cleanJsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIdx = cleanJsonStr.indexOf('{');
    const endIdx = cleanJsonStr.lastIndexOf('}');

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleanJsonStr = cleanJsonStr.substring(startIdx, endIdx + 1);
      const parsed = JSON.parse(cleanJsonStr);
      return { success: true, data: parsed };
    }

    return runSmartFallbackAnalysis(rawText, meetingDate);
  } catch (err: any) {
    console.error('Error procesando con IA:', err);
    return runSmartFallbackAnalysis(rawText, meetingDate);
  }
}

/**
 * Parser inteligente de contingencia si la conexión con la API externa no está disponible
 */
function runSmartFallbackAnalysis(rawText: string, meetingDate: string) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const agreements: Array<{ task: string; responsible: string; deadline: string }> = [];

  const baseDate = new Date(meetingDate);

  lines.forEach((line, idx) => {
    let resp = 'Todas / Equipo';
    const lower = line.toLowerCase();
    if (lower.includes('tatiana') || lower.includes('tati')) resp = 'Tatiana Torres';
    else if (lower.includes('gabriela') || lower.includes('gaby') || lower.includes('gabi')) resp = 'Gabriela';
    else if (lower.includes('paola') || lower.includes('pao')) resp = 'Paola';

    // Fecha aproximada (días subsiguientes)
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + ((idx + 1) % 5) + 1);
    const deadlineStr = targetDate.toISOString().split('T')[0];

    agreements.push({
      task: line.replace(/^[0-9\-\.\*•]+\s*/, ''),
      responsible: resp,
      deadline: deadlineStr
    });
  });

  return {
    success: true,
    data: {
      title: 'Reunión Semanal de Coordinación y Acuerdos',
      agenda_topics: lines.slice(0, 3).map((l, i) => `${i + 1}. ${l}`).join('\n') || 'Coordinación semanal de actividades.',
      attendees: ['Tatiana Torres', 'Gabriela', 'Paola'],
      agreements: agreements.length > 0 ? agreements : [
        { task: rawText.substring(0, 80), responsible: 'Tatiana Torres', deadline: meetingDate }
      ],
      notes: 'Acta generada y estructurada para seguimiento semanal en cronograma.'
    }
  };
}


