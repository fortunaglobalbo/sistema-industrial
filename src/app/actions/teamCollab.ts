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
