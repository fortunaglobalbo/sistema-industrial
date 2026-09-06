'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, Plus, CheckCircle2, Clock, 
  Trash2, Calendar, User, Filter, Check, RefreshCw, 
  ChevronLeft, ChevronRight, FileText, Printer, 
  Sparkles, ListChecks, CheckSquare, Layers, Share2, Download, AlertCircle, X
} from 'lucide-react';
import Swal from 'sweetalert2';
import { TEAM_MEMBERS_LIST, getMemberColorTheme } from '@/lib/teamAuth';
import { 
  getTeamTasks, createTeamTask, toggleTeamTaskComplete, deleteTeamTask, 
  getTeamMeetingMinutes, saveTeamMeetingMinute, deleteTeamMeetingMinute, 
  analyzeMeetingNotesWithAI, TeamTaskRecord 
} from '@/app/actions/teamCollab';

export interface SafetyNotice {
  id: string;
  title: string;
  date: string;
  responsible: string;
  category: string;
  priority: 'Alta' | 'Media' | 'Informativa';
  notes: string;
  completed: boolean;
  createdAt: string;
}

export interface MeetingAgreement {
  id?: string;
  task: string;
  responsible: string;
  deadline: string;
}

export interface MeetingMinute {
  id: string;
  correlative_number: string;
  meeting_date: string;
  start_time: string;
  title: string;
  attendees: string[];
  agenda_topics: string;
  agreements: MeetingAgreement[];
  notes: string;
  created_by: string;
  created_at: string;
}

const DEFAULT_NOTICES: SafetyNotice[] = [
  {
    id: 'not-1',
    title: 'Recepción y Control de Botellones Aquabel',
    date: new Date().toISOString().split('T')[0],
    responsible: 'Tatiana Torres',
    category: 'Recepción Agua',
    priority: 'Alta',
    notes: 'Verificar sellos de seguridad y registrar conformidad de las recargas recibidas.',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'not-2',
    title: 'Revisión y Relevamiento de Extintores en Transmisión',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    responsible: 'Gabriela',
    category: 'Inspección',
    priority: 'Media',
    notes: 'Inspección trimestral de manómetros, precintos y mangueras en subestaciones.',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'not-3',
    title: 'Entrega y Reposición de Botiquines a Mantenimiento Rural',
    date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    responsible: 'Paola',
    category: 'Entrega EPP',
    priority: 'Media',
    notes: 'Entrega de kits vehiculares revisados con insumos vigentes.',
    completed: false,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_MINUTES: MeetingMinute[] = [
  {
    id: 'min-1',
    correlative_number: 'ACTA-SEM-01/2026',
    meeting_date: new Date().toISOString().split('T')[0],
    start_time: '08:30',
    title: 'Reunión Semanal de Planificación y Coordinación de Seguridad',
    attendees: ['Tatiana Torres', 'Gabriela', 'Paola'],
    agenda_topics: '1. Planificación de dotación EPP mensual.\n2. Verificación de botellones y dispensadores de agua.\n3. Relevamiento de extintores en subestaciones de transmisión.',
    agreements: [
      {
        task: 'Recepción y control de lote de agua Aquabel',
        responsible: 'Tatiana Torres',
        deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      },
      {
        task: 'Inspección física de extintores y manómetros',
        responsible: 'Gabriela',
        deadline: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
      },
      {
        task: 'Control de botiquines y reposición de insumos de primeros auxilios',
        responsible: 'Paola',
        deadline: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0]
      }
    ],
    notes: 'Se acuerda realizar el seguimiento de los compromisos a través del cronograma del sistema.',
    created_by: 'Tatiana Torres',
    created_at: new Date().toISOString()
  }
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ModuloAvisosCronograma() {
  // Pestaña activa dentro del módulo
  const [activeView, setActiveView] = useState<'calendar' | 'cards' | 'minutes'>('calendar');

  // Estado de actividades
  const [notices, setNotices] = useState<SafetyNotice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('Todas');
  const [filterResponsible, setFilterResponsible] = useState<string>('Todas');

  // Form State de Actividad
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [responsible, setResponsible] = useState('Tatiana Torres');
  const [categorySelect, setCategorySelect] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [priority, setPriority] = useState<'Alta' | 'Media' | 'Informativa'>('Media');
  const [notes, setNotes] = useState('');

  // Estado del Calendario Mensual
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: SafetyNotice[] } | null>(null);

  // Estado de Actas de Reunión
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [showMinuteModal, setShowMinuteModal] = useState(false);
  const [printingMinute, setPrintingMinute] = useState<MeetingMinute | null>(null);

  // Form State de Acta
  const [minuteCorrelative, setMinuteCorrelative] = useState('');
  const [minuteDate, setMinuteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [minuteTime, setMinuteTime] = useState('08:30');
  const [minuteTitle, setMinuteTitle] = useState('Reunión de Planificación y Coordinación Semanal');
  const [minuteAttendees, setMinuteAttendees] = useState<string[]>(['Tatiana Torres', 'Gabriela', 'Paola']);
  const [minuteAgenda, setMinuteAgenda] = useState('');
  const [minuteNotes, setMinuteNotes] = useState('');
  const [minuteAgreements, setMinuteAgreements] = useState<MeetingAgreement[]>([
    { task: '', responsible: 'Tatiana Torres', deadline: new Date().toISOString().split('T')[0] }
  ]);
  const [rawMeetingNotes, setRawMeetingNotes] = useState('');
  const [analyzingAI, setAnalyzingAI] = useState(false);

  useEffect(() => {
    loadNotices();
    loadMinutes();
  }, []);

  // Cargar actividades desde Supabase / Local
  const loadNotices = async () => {
    setLoading(true);
    try {
      const res = await getTeamTasks();
      if (res.success && res.data && res.data.length > 0) {
        const mapped: SafetyNotice[] = res.data.map((r) => ({
          id: r.id,
          title: r.title,
          date: r.scheduled_date,
          responsible: r.responsible,
          category: r.category,
          priority: (r.priority as any) || 'Media',
          notes: r.notes || '',
          completed: r.completed,
          createdAt: r.created_at
        }));
        setNotices(mapped);
        localStorage.setItem('safety_team_notices_v1', JSON.stringify(mapped));
      } else {
        const saved = localStorage.getItem('safety_team_notices_v1');
        if (saved) {
          setNotices(JSON.parse(saved));
        } else {
          setNotices(DEFAULT_NOTICES);
          localStorage.setItem('safety_team_notices_v1', JSON.stringify(DEFAULT_NOTICES));
        }
      }
    } catch {
      const saved = localStorage.getItem('safety_team_notices_v1');
      setNotices(saved ? JSON.parse(saved) : DEFAULT_NOTICES);
    } finally {
      setLoading(false);
    }
  };

  // Cargar actas de reunión
  const loadMinutes = async () => {
    try {
      const res = await getTeamMeetingMinutes();
      if (res.success && res.data && res.data.length > 0) {
        const mapped: MeetingMinute[] = res.data.map((m: any) => ({
          id: m.id,
          correlative_number: m.correlative_number,
          meeting_date: m.meeting_date,
          start_time: m.start_time || '08:30',
          title: m.title,
          attendees: Array.isArray(m.attendees) ? m.attendees : ['Tatiana Torres', 'Gabriela', 'Paola'],
          agenda_topics: m.agenda_topics || '',
          agreements: Array.isArray(m.agreements) ? m.agreements : [],
          notes: m.notes || '',
          created_by: m.created_by || 'Tatiana Torres',
          created_at: m.created_at
        }));
        setMinutes(mapped);
        localStorage.setItem('safety_team_minutes_v1', JSON.stringify(mapped));
      } else {
        const saved = localStorage.getItem('safety_team_minutes_v1');
        if (saved) {
          setMinutes(JSON.parse(saved));
        } else {
          setMinutes(DEFAULT_MINUTES);
          localStorage.setItem('safety_team_minutes_v1', JSON.stringify(DEFAULT_MINUTES));
        }
      }
    } catch {
      const saved = localStorage.getItem('safety_team_minutes_v1');
      setMinutes(saved ? JSON.parse(saved) : DEFAULT_MINUTES);
    }
  };

  const saveNoticesToStorage = (updated: SafetyNotice[]) => {
    setNotices(updated);
    try {
      localStorage.setItem('safety_team_notices_v1', JSON.stringify(updated));
    } catch (err) {
      console.warn('Error en localStorage:', err);
    }
  };

  // Crear Aviso/Actividad
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      Swal.fire({ icon: 'warning', title: 'Título requerido', text: 'Especifique la actividad a programar.' });
      return;
    }

    const finalCategory = categorySelect === 'Otro'
      ? (customCategory.trim() || 'Otro')
      : categorySelect;

    const tempId = `notice-${Date.now()}`;
    const newNotice: SafetyNotice = {
      id: tempId,
      title: title.trim(),
      date,
      responsible: responsible.trim(),
      category: finalCategory,
      priority,
      notes: notes.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    const updated = [newNotice, ...notices];
    saveNoticesToStorage(updated);

    Swal.fire({
      icon: 'success',
      title: 'Actividad Programada',
      text: `Asignada a ${responsible} para el ${date}.`,
      timer: 1600,
      showConfirmButton: false
    });

    try {
      const res = await createTeamTask({
        title: newNotice.title,
        scheduled_date: newNotice.date,
        responsible: newNotice.responsible,
        category: newNotice.category,
        priority: newNotice.priority,
        notes: newNotice.notes,
        created_by: responsible
      });
      if (res.success && res.data) {
        setNotices((prev) => prev.map((n) => (n.id === tempId ? { ...n, id: res.data!.id } : n)));
      }
    } catch (err) {
      console.warn('Guardado en base de datos pendiente:', err);
    }

    setTitle('');
    setNotes('');
    setCategorySelect('General');
    setCustomCategory('');
    setShowModal(false);
  };

  const handleToggleComplete = async (id: string) => {
    const target = notices.find((n) => n.id === id);
    if (!target) return;

    const newCompleted = !target.completed;
    const updated = notices.map((n) => (n.id === id ? { ...n, completed: newCompleted } : n));
    saveNoticesToStorage(updated);

    try {
      await toggleTeamTaskComplete(id, newCompleted);
    } catch (err) {
      console.warn('Error al actualizar en Supabase:', err);
    }
  };

  const handleDelete = (id: string, noticeTitle: string) => {
    Swal.fire({
      title: '¿Eliminar actividad?',
      text: `Se retirará "${noticeTitle}" del cronograma.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (res) => {
      if (res.isConfirmed) {
        const updated = notices.filter((n) => n.id !== id);
        saveNoticesToStorage(updated);
        try {
          await deleteTeamTask(id);
        } catch (err) {
          console.warn('Error al eliminar en Supabase:', err);
        }
      }
    });
  };

  // Abrir modal de nueva acta con correlativo automático
  const handleOpenNewMinute = () => {
    const nextNum = minutes.length + 1;
    const year = new Date().getFullYear();
    setMinuteCorrelative(`ACTA-SEM-${String(nextNum).padStart(2, '0')}/${year}`);
    setMinuteDate(new Date().toISOString().split('T')[0]);
    setMinuteTime('08:30');
    setMinuteTitle('Reunión de Planificación y Coordinación Semanal');
    setMinuteAttendees(['Tatiana Torres', 'Gabriela', 'Paola']);
    setMinuteAgenda('1. Planificación semanal de actividades de seguridad industrial.\n2. Verificación y seguimiento de inspecciones pendientes.\n3. Coordinación de recepciones y dotaciones.');
    setMinuteNotes('');
    setRawMeetingNotes('');
    setMinuteAgreements([
      { task: '', responsible: 'Tatiana Torres', deadline: new Date().toISOString().split('T')[0] }
    ]);
    setShowMinuteModal(true);
  };

  // Analizar notas libres de la reunión con Inteligencia Artificial
  const handleAnalyzeWithAI = async () => {
    if (!rawMeetingNotes.trim()) {
      Swal.fire({
        icon: 'info',
        title: 'Notas requeridas',
        text: 'Escriba o pegue el resumen o las notas habladas de la reunión para que la IA extraiga los compromisos.',
        confirmButtonColor: '#002f6c'
      });
      return;
    }

    setAnalyzingAI(true);
    try {
      const res = await analyzeMeetingNotesWithAI(rawMeetingNotes, minuteDate);
      if (res.success && res.data) {
        if (res.data.title) setMinuteTitle(res.data.title);
        if (res.data.agenda_topics) setMinuteAgenda(res.data.agenda_topics);
        if (res.data.attendees && Array.isArray(res.data.attendees)) {
          setMinuteAttendees(res.data.attendees);
        }
        if (res.data.agreements && Array.isArray(res.data.agreements) && res.data.agreements.length > 0) {
          setMinuteAgreements(res.data.agreements);
        }
        if (res.data.notes) setMinuteNotes(res.data.notes);

        Swal.fire({
          icon: 'success',
          title: '¡Acta Estructurada por IA!',
          text: `La IA detectó y asignó ${res.data.agreements?.length || 0} acuerdos con sus respectivas encargadas y fechas límite.`,
          confirmButtonColor: '#002f6c'
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Aviso',
          text: res.error || 'No se pudo estructurar el texto. Intente agregando más detalles.',
          confirmButtonColor: '#002f6c'
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de IA',
        text: err?.message || 'Error de conexión con el asistente de IA.',
        confirmButtonColor: '#002f6c'
      });
    } finally {
      setAnalyzingAI(false);
    }
  };

  // Agregar fila de compromiso
  const handleAddAgreementRow = () => {
    setMinuteAgreements([
      ...minuteAgreements,
      { task: '', responsible: 'Gabriela', deadline: new Date().toISOString().split('T')[0] }
    ]);
  };

  // Eliminar fila de compromiso
  const handleRemoveAgreementRow = (index: number) => {
    setMinuteAgreements(minuteAgreements.filter((_, idx) => idx !== index));
  };

  // Actualizar fila de compromiso
  const handleUpdateAgreementRow = (index: number, field: keyof MeetingAgreement, value: string) => {
    const updated = [...minuteAgreements];
    updated[index] = { ...updated[index], [field]: value };
    setMinuteAgreements(updated);
  };

  // Guardar Acta
  const handleSaveMinute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minuteCorrelative.trim() || !minuteTitle.trim()) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Indique correlativo y título del acta.' });
      return;
    }

    const validAgreements = minuteAgreements.filter((a) => a.task.trim() !== '');

    const tempId = `minute-${Date.now()}`;
    const newMinute: MeetingMinute = {
      id: tempId,
      correlative_number: minuteCorrelative.trim(),
      meeting_date: minuteDate,
      start_time: minuteTime,
      title: minuteTitle.trim(),
      attendees: minuteAttendees,
      agenda_topics: minuteAgenda.trim(),
      agreements: validAgreements,
      notes: minuteNotes.trim(),
      created_by: 'Tatiana Torres',
      created_at: new Date().toISOString()
    };

    const updated = [newMinute, ...minutes];
    setMinutes(updated);
    localStorage.setItem('safety_team_minutes_v1', JSON.stringify(updated));

    Swal.fire({
      icon: 'success',
      title: 'Acta Registrada',
      text: `${newMinute.correlative_number} guardada exitosamente.`,
      timer: 1600,
      showConfirmButton: false
    });

    try {
      const res = await saveTeamMeetingMinute({
        correlative_number: newMinute.correlative_number,
        meeting_date: newMinute.meeting_date,
        start_time: newMinute.start_time,
        title: newMinute.title,
        attendees: newMinute.attendees,
        agenda_topics: newMinute.agenda_topics,
        agreements: newMinute.agreements,
        notes: newMinute.notes,
        created_by: newMinute.created_by
      });
      if (res.success && res.data) {
        setMinutes((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: res.data.id } : m)));
      }
    } catch (err) {
      console.warn('Error al guardar acta en Supabase:', err);
    }

    setShowMinuteModal(false);
  };

  // Sincronizar acuerdos del acta directamente al calendario
  const handleSyncAgreementsToCalendar = async (minute: MeetingMinute) => {
    if (!minute.agreements || minute.agreements.length === 0) {
      Swal.fire({ icon: 'info', title: 'Sin acuerdos', text: 'Esta acta no tiene compromisos registrados para sincronizar.' });
      return;
    }

    let addedCount = 0;
    const newNotices: SafetyNotice[] = [];

    for (const agreement of minute.agreements) {
      if (!agreement.task.trim()) continue;

      const notice: SafetyNotice = {
        id: `notice-sync-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        title: agreement.task.trim(),
        date: agreement.deadline,
        responsible: agreement.responsible,
        category: 'Reunión',
        priority: 'Alta',
        notes: `Compromiso acordado en ${minute.correlative_number}`,
        completed: false,
        createdAt: new Date().toISOString()
      };

      newNotices.push(notice);
      addedCount++;

      // Guardar en Supabase en segundo plano
      createTeamTask({
        title: notice.title,
        scheduled_date: notice.date,
        responsible: notice.responsible,
        category: notice.category,
        priority: notice.priority,
        notes: notice.notes,
        created_by: 'Sincronización de Acta'
      }).catch((e) => console.warn('Sync background task error:', e));
    }

    const updated = [...newNotices, ...notices];
    saveNoticesToStorage(updated);

    Swal.fire({
      icon: 'success',
      title: '¡Acuerdos Sincronizados!',
      text: `Se agregaron ${addedCount} tareas al calendario con sus colores correspondientes.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleDeleteMinute = (id: string, correlative: string) => {
    Swal.fire({
      title: '¿Eliminar Acta?',
      text: `Se retirará el acta ${correlative} del archivo.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (res) => {
      if (res.isConfirmed) {
        const updated = minutes.filter((m) => m.id !== id);
        setMinutes(updated);
        localStorage.setItem('safety_team_minutes_v1', JSON.stringify(updated));
        try {
          await deleteTeamMeetingMinute(id);
        } catch (err) {
          console.warn('Error al eliminar acta en Supabase:', err);
        }
      }
    });
  };

  // Navegación del Calendario
  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const d = new Date();
    setCalendarDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // Cálculo de la cuadrícula de días del mes
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0

  const calendarDays: Array<{ dayNumber: number | null; dateString: string | null }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ dayNumber: null, dateString: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    calendarDays.push({ dayNumber: d, dateString: `${year}-${mm}-${dd}` });
  }

  // Filtrar actividades para la vista de tarjetas
  const filteredNotices = notices.filter((n) => {
    const matchCat = filterCategory === 'Todas' || n.category === filterCategory;
    const matchResp = filterResponsible === 'Todas' || n.responsible === filterResponsible;
    return matchCat && matchResp;
  });

  const pendingCount = notices.filter((n) => !n.completed).length;
  const completedCount = notices.filter((n) => n.completed).length;

  const todayString = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      
      {/* BARRA DE CONTROL Y ACCIONES DEL CRONOGRAMA ENDE DEORURO */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest uppercase bg-blue-50 text-[#002f6c] px-2.5 py-0.5 rounded-full border border-blue-200">
              Coordinación de Seguridad Industrial
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 mt-1">
            Cronograma de Actividades, Avisos y Actas de Reunión
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Planificación de inspecciones, reuniones de los lunes y seguimiento de tareas en ENDE DEORURO.
          </p>

          {/* Leyenda de Colores Oficial de las Integrantes */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-bold">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Integrantes:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Tatiana (Rosita)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span> Paola (Celeste)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Gabriela (Rojo)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Equipo (Dorado ENDE)
            </span>
          </div>
        </div>

        {/* Botones de acción rápida */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              setDate(new Date().toISOString().split('T')[0]);
              setShowModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#002f6c] hover:bg-[#003876] text-white font-black text-xs px-4 py-3 rounded-2xl shadow-md transition transform hover:scale-[1.01] cursor-pointer border border-amber-400/40"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ Programar Actividad</span>
          </button>
          <button
            onClick={handleOpenNewMinute}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-3 rounded-2xl border border-slate-700 shadow-md transition cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>+ Acta Reunión Lunes</span>
          </button>
        </div>
      </div>

      {/* SELECTOR SUPERIOR DE VISTAS (OPCIÓN A) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveView('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
              activeView === 'calendar'
                ? 'bg-[#002f6c] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Calendario Mensual (Colores)</span>
          </button>

          <button
            onClick={() => setActiveView('cards')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
              activeView === 'cards'
                ? 'bg-[#002f6c] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Tablero de Avisos ({notices.length})</span>
          </button>

          <button
            onClick={() => setActiveView('minutes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
              activeView === 'minutes'
                ? 'bg-[#002f6c] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Actas de Reunión Semanal ({minutes.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          <button
            onClick={() => {
              loadNotices();
              loadMinutes();
            }}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: CALENDARIO MENSUAL CON CÓDIGO DE COLORES        */}
      {/* ========================================================= */}
      {activeView === 'calendar' && (
        <div className="space-y-4">
          
          {/* BARRA DE NAVEGACIÓN DEL CALENDARIO Y FILTRO POR RESPONSABLE */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <h3 className="text-base font-black text-slate-900 min-w-[180px] text-center capitalize">
                {MONTH_NAMES[month]} {year}
              </h3>

              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleToday}
                className="ml-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Hoy
              </button>
            </div>

            {/* Filtro por Persona para el Calendario */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filtrar calendario:</span>
              <select
                value={filterResponsible}
                onChange={(e) => setFilterResponsible(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 w-full md:w-auto"
              >
                <option value="Todas">Mostrar a todas (Equipo completo)</option>
                <option value="Tatiana Torres">Solo Tatiana (Rosita)</option>
                <option value="Paola">Solo Paola (Celeste)</option>
                <option value="Gabriela">Solo Gabriela (Rojo)</option>
                <option value="Todas / Equipo">Solo Equipo (Dorado ENDE)</option>
              </select>
            </div>
          </div>

          {/* CUADRÍCULA DEL CALENDARIO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Cabecera de Días (Lun a Dom) */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center font-black text-xs text-slate-600 py-3">
              {DAY_NAMES.map((d, i) => (
                <div key={d} className={i >= 5 ? 'text-amber-700' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Días del Mes */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {calendarDays.map((cell, idx) => {
                if (!cell.dayNumber || !cell.dateString) {
                  return <div key={`empty-${idx}`} className="h-28 sm:h-32 bg-slate-50/30" />;
                }

                const isToday = cell.dateString === todayString;
                const dayEvents = notices.filter((n) => {
                  const matchDate = n.date === cell.dateString;
                  const matchResp = filterResponsible === 'Todas' || n.responsible === filterResponsible;
                  return matchDate && matchResp;
                });

                return (
                  <div
                    key={cell.dateString}
                    onClick={() => {
                      if (dayEvents.length > 0) {
                        setSelectedDayEvents({ date: cell.dateString!, events: dayEvents });
                      } else {
                        setDate(cell.dateString!);
                        setShowModal(true);
                      }
                    }}
                    className={`h-28 sm:h-32 p-1.5 flex flex-col justify-between transition cursor-pointer hover:bg-blue-50/30 ${
                      isToday ? 'bg-amber-50/40 ring-1 ring-amber-400 inset-0' : 'bg-white'
                    }`}
                  >
                    {/* Número de Día */}
                    <div className="flex justify-between items-center px-1">
                      <span className={`text-xs font-black rounded-lg w-6 h-6 flex items-center justify-center ${
                        isToday 
                          ? 'bg-amber-500 text-slate-950 shadow-sm' 
                          : 'text-slate-700'
                      }`}>
                        {cell.dayNumber}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Lista de Eventos / Tareas en este día */}
                    <div className="space-y-1 overflow-y-auto no-scrollbar flex-1 my-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const theme = getMemberColorTheme(event.responsible);
                        return (
                          <div
                            key={event.id}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-black truncate border shadow-2xs ${theme.calendarPill} ${
                              event.completed ? 'line-through opacity-60' : ''
                            }`}
                            title={`${event.responsible}: ${event.title}`}
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: theme.accentColor }} />
                            {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <p className="text-[9px] font-black text-slate-500 text-center">
                          +{dayEvents.length - 3} más
                        </p>
                      )}
                    </div>

                    {/* Botón rápido para agregar si no hay eventos */}
                    <div className="text-right">
                      <span className="text-[9px] text-slate-300 font-bold opacity-0 hover:opacity-100 transition">
                        + Agregar
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: TABLERO DE AVISOS (TARJETAS TRADICIONALES)       */}
      {/* ========================================================= */}
      {activeView === 'cards' && (
        <div className="space-y-4">
          {/* Métricas y Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Actividades Pendientes</p>
                <p className="text-2xl font-black font-mono text-slate-900">{pendingCount}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Completadas</p>
                <p className="text-2xl font-black font-mono text-slate-900">{completedCount}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Filtrar por Área / Responsable:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="Todas">Todas las categorías</option>
                  <option value="Recepción Agua">Recepción Agua</option>
                  <option value="Entrega EPP">Entrega EPP</option>
                  <option value="Inspección">Inspección</option>
                  <option value="Reunión">Reunión</option>
                  <option value="Auditoría">Auditoría</option>
                  <option value="General">General</option>
                </select>

                <select
                  value={filterResponsible}
                  onChange={(e) => setFilterResponsible(e.target.value)}
                  className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="Todas">Todo el equipo</option>
                  <option value="Tatiana Torres">Tatiana (Rosita)</option>
                  <option value="Paola">Paola (Celeste)</option>
                  <option value="Gabriela">Gabriela (Rojo)</option>
                  <option value="Todas / Equipo">Equipo (Dorado)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tarjetas */}
          {filteredNotices.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              No hay actividades registradas con los filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotices.map((notice) => {
                const theme = getMemberColorTheme(notice.responsible);
                const isPast = new Date(notice.date + 'T23:59:59') < new Date() && !notice.completed;

                return (
                  <div
                    key={notice.id}
                    className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between space-y-3 transition ${
                      notice.completed 
                        ? 'border-emerald-200 bg-emerald-50/20' 
                        : isPast 
                        ? 'border-amber-300 bg-amber-50/20' 
                        : `${theme.cardBorder}`
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-800 border-slate-200 truncate max-w-[130px]">
                          {notice.category}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          notice.priority === 'Alta' 
                            ? 'bg-red-100 text-red-700' 
                            : notice.priority === 'Media' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {notice.priority}
                        </span>
                      </div>

                      <h4 className={`text-sm font-extrabold ${notice.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {notice.title}
                      </h4>

                      {notice.notes && (
                        <p className="text-xs text-slate-600 leading-snug">
                          {notice.notes}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500 font-medium text-[11px]">
                        <span className="flex items-center gap-1 font-mono font-bold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          {notice.date}
                        </span>
                        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${theme.badge}`}>
                          <User className="w-3 h-3" />
                          {notice.responsible}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <button
                          onClick={() => handleToggleComplete(notice.id)}
                          className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            notice.completed 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{notice.completed ? 'Realizado' : 'Marcar Hecho'}</span>
                        </button>

                        <button
                          onClick={() => handleDelete(notice.id, notice.title)}
                          className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Eliminar actividad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 3: ACTAS DE REUNIÓN SEMANAL (LOS LUNES)             */}
      {/* ========================================================= */}
      {activeView === 'minutes' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                Archivo de Actas de Reunión Semanal
              </h3>
              <p className="text-xs text-slate-500">
                Coordinación de los lunes: acuerdos, asignación de tareas y generación del acta formal.
              </p>
            </div>

            <button
              onClick={handleOpenNewMinute}
              className="flex items-center gap-2 bg-[#002f6c] hover:bg-blue-900 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Redactar Acta de Reunión</span>
            </button>
          </div>

          {minutes.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              No hay actas de reunión registradas todavía. Presiona "+ Redactar Acta de Reunión" para registrar la primera reunión del lunes.
            </div>
          ) : (
            <div className="space-y-4">
              {minutes.map((minute) => (
                <div key={minute.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl font-black text-xs border border-blue-200 font-mono">
                        {minute.correlative_number}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{minute.title}</h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Fecha: <span className="font-bold text-slate-700">{minute.meeting_date}</span> a las {minute.start_time} hrs.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Sincronizar acuerdos al calendario */}
                      <button
                        onClick={() => handleSyncAgreementsToCalendar(minute)}
                        className="flex items-center gap-1.5 text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
                        title="Inyecta los acuerdos de esta reunión al calendario"
                      >
                        <Share2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pasar acuerdos al calendario</span>
                      </button>

                      {/* Imprimir / Ver formal */}
                      <button
                        onClick={() => setPrintingMinute(minute)}
                        className="flex items-center gap-1.5 text-xs font-black bg-[#002f6c] hover:bg-blue-900 text-white px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ver / Imprimir Acta</span>
                      </button>

                      {/* Eliminar */}
                      <button
                        onClick={() => handleDeleteMinute(minute.id, minute.correlative_number)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                        title="Eliminar acta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Asistentes */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-500">Asistentes:</span>
                    {minute.attendees.map((att) => {
                      const theme = getMemberColorTheme(att);
                      return (
                        <span key={att} className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${theme.badge}`}>
                          {att}
                        </span>
                      );
                    })}
                  </div>

                  {/* Temas / Agenda */}
                  {minute.agenda_topics && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Agenda y Temas Tratados:</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{minute.agenda_topics}</p>
                    </div>
                  )}

                  {/* Tabla de Acuerdos y Compromisos */}
                  <div>
                    <p className="text-[11px] font-black text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                      <ListChecks className="w-4 h-4 text-blue-700" />
                      Compromisos y Acuerdos de la Semana ({minute.agreements?.length || 0}):
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Tarea / Compromiso Acordado</th>
                            <th className="p-2.5 w-44">Responsable</th>
                            <th className="p-2.5 w-32">Fecha Límite</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {minute.agreements && minute.agreements.length > 0 ? (
                            minute.agreements.map((agr, idx) => {
                              const theme = getMemberColorTheme(agr.responsible);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 font-bold text-slate-800">{agr.task}</td>
                                  <td className="p-2.5">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${theme.badge}`}>
                                      {agr.responsible}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-mono font-bold text-slate-600">{agr.deadline}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={3} className="p-3 text-center text-slate-400">
                                Sin compromisos específicos detallados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {minute.notes && (
                    <p className="text-xs text-slate-500 italic">
                      Nota: {minute.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REGISTRAR NUEVA ACTIVIDAD EN EL CRONOGRAMA         */}
      {/* ========================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#002f6c] text-white p-5 flex justify-between items-center">
              <div>
                <h4 className="text-base font-black tracking-tight">Programar Actividad / Aviso</h4>
                <p className="text-xs text-blue-200">Asigna la responsable y programa la fecha en el calendario</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                  Título de la Actividad o Aviso *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Inspección de extintores / Recepción de agua / Entrega de EPP"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              {/* RESPONSABLE Y FECHA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Responsable Asignada *
                  </label>
                  <select
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Tatiana Torres">Tatiana Torres (Rosita)</option>
                    <option value="Paola">Paola (Celeste)</option>
                    <option value="Gabriela">Gabriela (Rojo)</option>
                    <option value="Todas / Equipo">Todas / Equipo (Dorado ENDE)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Fecha Programada *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              {/* CATEGORÍA Y PRIORIDAD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Categoría
                  </label>
                  <select
                    value={categorySelect}
                    onChange={(e) => setCategorySelect(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Recepción Agua">Recepción Agua</option>
                    <option value="Entrega EPP">Entrega EPP</option>
                    <option value="Inspección">Inspección</option>
                    <option value="Reunión">Reunión</option>
                    <option value="Auditoría">Auditoría</option>
                    <option value="General">General</option>
                    <option value="Otro">Otro (Escribir categoría)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Prioridad
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Alta">Alta (Urgente)</option>
                    <option value="Media">Media</option>
                    <option value="Informativa">Informativa</option>
                  </select>
                </div>
              </div>

              {categorySelect === 'Otro' && (
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 animate-in fade-in">
                  <label className="text-[10px] font-bold text-amber-900 block mb-1 uppercase">
                    Escriba la Categoría Personalizada *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Capacitación, Simulacro, Fumigación, Mantenimiento..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full border border-amber-300 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                  Detalle / Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles para coordinar, acuerdos, hora o instrucciones..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002f6c] hover:bg-blue-900 text-white font-black rounded-xl shadow transition cursor-pointer"
                >
                  Guardar en Calendario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VER ACTIVIDADES DE UN DÍA ESPECÍFICO DEL CALENDARIO */}
      {/* ========================================================= */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#002f6c] text-white p-4 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Actividades del {selectedDayEvents.date}
                </h4>
                <p className="text-[11px] text-blue-200">
                  {selectedDayEvents.events.length} actividad(es) programada(s)
                </p>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-slate-300 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedDayEvents.events.map((event) => {
                const theme = getMemberColorTheme(event.responsible);
                return (
                  <div
                    key={event.id}
                    className={`p-3 rounded-xl border ${theme.cardBorder} flex flex-col justify-between space-y-2`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${theme.badge}`}>
                          {event.responsible}
                        </span>
                        <h5 className={`text-xs font-black mt-1 ${event.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {event.title}
                        </h5>
                        {event.notes && (
                          <p className="text-[11px] text-slate-600 mt-0.5">{event.notes}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {event.category}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => {
                          handleToggleComplete(event.id);
                          setSelectedDayEvents({
                            ...selectedDayEvents,
                            events: selectedDayEvents.events.map((e) => e.id === event.id ? { ...e, completed: !e.completed } : e)
                          });
                        }}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                          event.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{event.completed ? 'Completada' : 'Marcar Hecho'}</span>
                      </button>

                      <button
                        onClick={() => {
                          handleDelete(event.id, event.title);
                          setSelectedDayEvents({
                            ...selectedDayEvents,
                            events: selectedDayEvents.events.filter((e) => e.id !== event.id)
                          });
                        }}
                        className="text-slate-400 hover:text-red-600 p-1 transition cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setDate(selectedDayEvents.date);
                  setSelectedDayEvents(null);
                  setShowModal(true);
                }}
                className="text-xs font-black text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar otra tarea en esta fecha</span>
              </button>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REDACTAR ACTA DE REUNIÓN SEMANAL DE LOS LUNES       */}
      {/* ========================================================= */}
      {showMinuteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#002f6c] text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-base font-black tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Redactar Acta de Reunión Semanal (Lunes)
                </h4>
                <p className="text-xs text-blue-200">
                  Acuerdos y compromisos para coordinar y sincronizar al calendario
                </p>
              </div>
              <button onClick={() => setShowMinuteModal(false)} className="text-slate-300 hover:text-white text-lg font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMinute} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* ASISTENTE IA PARA REDACTAR Y ESTRUCTURAR EL ACTA */}
              <div className="bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-amber-900/10 border-2 border-dashed border-blue-300/80 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl text-slate-950 shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        Asistente IA para Redacción de Acta
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white">
                          Inteligencia Artificial
                        </span>
                      </h5>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Escriba o pegue aquí las notas libres o lo conversado en la reunión. La IA detectará los acuerdos, responsables y fechas automáticamente.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Ejemplo: Nos reunimos hoy para planificar la semana. Tatiana revisará los botellones de agua que llegan mañana martes, Gabriela inspeccionará los extintores en subestaciones hasta el jueves y Paola entregará los botiquines el viernes..."
                    value={rawMeetingNotes}
                    onChange={(e) => setRawMeetingNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium shadow-inner"
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 italic">
                      * Al analizar, la IA completará los campos de abajo automáticamente
                    </span>
                    <button
                      type="button"
                      disabled={!rawMeetingNotes.trim() || analyzingAI}
                      onClick={handleAnalyzeWithAI}
                      className="flex items-center gap-2 bg-gradient-to-r from-[#002f6c] to-blue-800 hover:from-blue-900 hover:to-slate-950 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {analyzingAI ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          <span>Analizando con IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Analizar y Estructurar con IA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Correlativo de Acta *
                  </label>
                  <input
                    type="text"
                    value={minuteCorrelative}
                    onChange={(e) => setMinuteCorrelative(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Fecha de Reunión *
                  </label>
                  <input
                    type="date"
                    value={minuteDate}
                    onChange={(e) => setMinuteDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Hora de Inicio
                  </label>
                  <input
                    type="time"
                    value={minuteTime}
                    onChange={(e) => setMinuteTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                  Título de la Reunión *
                </label>
                <input
                  type="text"
                  value={minuteTitle}
                  onChange={(e) => setMinuteTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              {/* Asistentes Checkboxes */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                  Asistentes Convocadas
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Tatiana Torres', 'Gabriela', 'Paola'].map((name) => {
                    const isChecked = minuteAttendees.includes(name);
                    const theme = getMemberColorTheme(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setMinuteAttendees(minuteAttendees.filter((a) => a !== name));
                          } else {
                            setMinuteAttendees([...minuteAttendees, name]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer flex items-center gap-1.5 ${
                          isChecked ? `${theme.badge} shadow-xs` : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isChecked ? theme.dot : 'bg-slate-300'}`} />
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Agenda / Temas tratados */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                  Puntos Tratados / Orden del Día
                </label>
                <textarea
                  rows={3}
                  value={minuteAgenda}
                  onChange={(e) => setMinuteAgenda(e.target.value)}
                  placeholder="Escriba los puntos tratados y temas abordados en la reunión..."
                  className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Tabla de Compromisos Dinámica */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-700" />
                    Compromisos y Tareas Asignadas para la Semana
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAgreementRow}
                    className="text-xs font-black text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar compromiso</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {minuteAgreements.map((agr, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Descripción de la tarea o compromiso..."
                        value={agr.task}
                        onChange={(e) => handleUpdateAgreementRow(idx, 'task', e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                        required
                      />

                      <select
                        value={agr.responsible}
                        onChange={(e) => handleUpdateAgreementRow(idx, 'responsible', e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                      >
                        <option value="Tatiana Torres">Tatiana (Rosita)</option>
                        <option value="Paola">Paola (Celeste)</option>
                        <option value="Gabriela">Gabriela (Rojo)</option>
                        <option value="Todas / Equipo">Equipo (Dorado)</option>
                      </select>

                      <input
                        type="date"
                        value={agr.deadline}
                        onChange={(e) => handleUpdateAgreementRow(idx, 'deadline', e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-mono text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                        required
                      />

                      {minuteAgreements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAgreementRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer self-end sm:self-center"
                          title="Quitar compromiso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                  Observaciones / Conclusiones Adicionales
                </label>
                <textarea
                  rows={2}
                  value={minuteNotes}
                  onChange={(e) => setMinuteNotes(e.target.value)}
                  placeholder="Acuerdos complementarios, próxima fecha de reunión..."
                  className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMinuteModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#002f6c] hover:bg-blue-900 text-white font-black rounded-xl shadow transition cursor-pointer"
                >
                  Guardar Acta de Reunión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VER / IMPRIMIR ACTA DE REUNIÓN FORMAL              */}
      {/* ========================================================= */}
      {printingMinute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-300 overflow-hidden my-6">
            
            {/* Barra de herramientas para imprimir (No sale en papel) */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-black">Vista Previa de Impresión Oficial - ENDE DEORURO</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow transition cursor-pointer"
                >
                  Imprimir Documento
                </button>
                <button
                  onClick={() => setPrintingMinute(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* DOCUMENTO OFICIAL FORMAL (LISTO PARA IMPRIMIR) */}
            <div className="p-8 sm:p-12 space-y-6 text-slate-900 font-serif">
              {/* Membrete con Logo oficial de ENDE DEORURO */}
              <div className="flex justify-between items-center border-b-2 border-[#002f6c] pb-4">
                <img 
                  src="/logo_ende_deoruro.png" 
                  alt="ENDE DEORURO" 
                  className="h-16 w-auto object-contain"
                />
                <div className="text-right font-sans">
                  <h3 className="text-xs font-black uppercase text-[#002f6c] tracking-widest">
                    EMPRESA DE LUZ Y FUERZA ELÉCTRICA DE ORURO
                  </h3>
                  <p className="text-[10px] font-bold text-slate-600 uppercase">
                    SECCIÓN SEGURIDAD INDUSTRIAL Y SALUD OCUPACIONAL
                  </p>
                  <p className="text-xs font-black text-slate-900 font-mono mt-0.5">
                    {printingMinute.correlative_number}
                  </p>
                </div>
              </div>

              {/* Título */}
              <div className="text-center space-y-1 font-sans">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#002f6c]">
                  ACTA DE REUNIÓN DE PLANIFICACIÓN Y COORDINACIÓN SEMANAL
                </h2>
                <p className="text-xs font-medium text-slate-600">
                  Fecha de Reunión: <span className="font-bold text-slate-900">{printingMinute.meeting_date}</span> | Hora: <span className="font-bold text-slate-900">{printingMinute.start_time} hrs.</span>
                </p>
              </div>

              {/* Asistentes */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-sans text-xs space-y-1">
                <p className="text-[10px] font-black uppercase text-[#002f6c]">Personal Participante:</p>
                <p className="font-bold text-slate-800">
                  {printingMinute.attendees.join(' • ')}
                </p>
              </div>

              {/* Agenda y Puntos Tratados */}
              <div className="space-y-1 text-xs">
                <h4 className="font-sans text-[11px] font-black uppercase text-[#002f6c] tracking-wider">
                  1. PUNTOS ABORDADOS Y ORDEN DEL DÍA
                </h4>
                <div className="p-3 bg-white border border-slate-200 rounded-xl whitespace-pre-wrap leading-relaxed">
                  {printingMinute.agenda_topics || 'Revisión y coordinación semanal de actividades programadas de seguridad industrial.'}
                </div>
              </div>

              {/* Tabla de Acuerdos */}
              <div className="space-y-2 text-xs">
                <h4 className="font-sans text-[11px] font-black uppercase text-[#002f6c] tracking-wider">
                  2. ACUERDOS Y COMPROMISOS ASIGNADOS PARA LA SEMANA
                </h4>
                <table className="w-full text-left border-collapse border border-slate-300 font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-black">
                      <th className="border border-slate-300 p-2.5 w-10 text-center">N°</th>
                      <th className="border border-slate-300 p-2.5">Descripción de la Tarea / Compromiso</th>
                      <th className="border border-slate-300 p-2.5 w-44">Responsable</th>
                      <th className="border border-slate-300 p-2.5 w-32 text-center">Fecha Límite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printingMinute.agreements.map((agr, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2.5 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-300 p-2.5 font-bold text-slate-900">{agr.task}</td>
                        <td className="border border-slate-300 p-2.5 font-semibold text-slate-800">{agr.responsible}</td>
                        <td className="border border-slate-300 p-2.5 font-mono text-center font-bold text-slate-700">{agr.deadline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Conclusiones */}
              {printingMinute.notes && (
                <div className="space-y-1 text-xs">
                  <h4 className="font-sans text-[11px] font-black uppercase text-[#002f6c] tracking-wider">
                    3. OBSERVACIONES GENERALES
                  </h4>
                  <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed">
                    {printingMinute.notes}
                  </p>
                </div>
              )}

              {/* Firmas de Conformidad */}
              <div className="pt-10 font-sans">
                <p className="text-center text-[10px] uppercase font-bold text-slate-500 mb-8">
                  En señal de conformidad y coordinación mutua, suscriben las participantes:
                </p>

                <div className="grid grid-cols-3 gap-6 text-center text-xs">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-black text-slate-900">Tatiana Torres</p>
                    <p className="text-[10px] text-slate-600">Supervisión Seguridad Industrial</p>
                    <p className="text-[9px] text-slate-400 font-mono">ENDE DEORURO</p>
                  </div>

                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-black text-slate-900">Gabriela</p>
                    <p className="text-[10px] text-slate-600">Seguridad Industrial</p>
                    <p className="text-[9px] text-slate-400 font-mono">ENDE DEORURO</p>
                  </div>

                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-black text-slate-900">Paola</p>
                    <p className="text-[10px] text-slate-600">Salud Ocupacional</p>
                    <p className="text-[9px] text-slate-400 font-mono">ENDE DEORURO</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
