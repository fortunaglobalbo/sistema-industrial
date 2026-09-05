'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, Plus, CheckCircle2, Clock, 
  AlertCircle, Trash2, Calendar, User, Tag, 
  MessageSquare, Sparkles, Filter, Check, RefreshCw
} from 'lucide-react';
import Swal from 'sweetalert2';
import { TEAM_MEMBERS_LIST } from '@/lib/teamAuth';
import { 
  getTeamTasks, createTeamTask, toggleTeamTaskComplete, deleteTeamTask, TeamTaskRecord 
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

export default function ModuloAvisosCronograma() {
  const [notices, setNotices] = useState<SafetyNotice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('Todas');

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [responsible, setResponsible] = useState('Tatiana Torres');
  const [categorySelect, setCategorySelect] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [priority, setPriority] = useState<'Alta' | 'Media' | 'Informativa'>('Media');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    setLoading(true);
    try {
      // Intentar cargar desde Supabase
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
        // Fallback a localStorage
        const saved = localStorage.getItem('safety_team_notices_v1');
        if (saved) {
          setNotices(JSON.parse(saved));
        } else {
          setNotices(DEFAULT_NOTICES);
          localStorage.setItem('safety_team_notices_v1', JSON.stringify(DEFAULT_NOTICES));
        }
      }
    } catch (e) {
      const saved = localStorage.getItem('safety_team_notices_v1');
      if (saved) {
        setNotices(JSON.parse(saved));
      } else {
        setNotices(DEFAULT_NOTICES);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveNoticesToStorage = (updated: SafetyNotice[]) => {
    setNotices(updated);
    try {
      localStorage.setItem('safety_team_notices_v1', JSON.stringify(updated));
    } catch (err) {
      console.warn('Error guardando en localStorage:', err);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      Swal.fire({ icon: 'warning', title: 'Título requerido', text: 'Especifique la actividad o aviso a coordinar.' });
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

    // Actualización optimista
    const updated = [newNotice, ...notices];
    saveNoticesToStorage(updated);

    Swal.fire({
      icon: 'success',
      title: 'Aviso Publicado',
      text: `Actividad asignada a ${responsible}. Visible para todo el equipo.`,
      timer: 1800,
      showConfirmButton: false
    });

    // Enviar a Supabase en background
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
      console.warn('Guardado en base de datos en espera de conexión:', err);
    }

    // Reset form
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
      console.warn('Error alternando tarea en Supabase:', err);
    }
  };

  const handleDelete = (id: string, noticeTitle: string) => {
    Swal.fire({
      title: '¿Eliminar aviso?',
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
          console.warn('Error eliminando en Supabase:', err);
        }
      }
    });
  };

  const availableCategories = Array.from(
    new Set(['Todas', 'Recepción Agua', 'Entrega EPP', 'Inspección', 'Reunión', 'Auditoría', 'General', ...notices.map((n) => n.category)])
  );

  const filteredNotices = notices.filter((n) => {
    if (filterCategory === 'Todas') return true;
    return n.category === filterCategory;
  });

  const pendingCount = notices.filter((n) => !n.completed).length;
  const completedCount = notices.filter((n) => n.completed).length;

  const getResponsibleBadge = (resp: string) => {
    if (resp.includes('Tatiana')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
    if (resp.includes('Gabriela')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (resp.includes('Paola')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-purple-100 text-purple-800 border-purple-200';
  };

  return (
    <div className="space-y-6">
      
      {/* BANNER PRINCIPAL */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-white/10 rounded-2xl border border-white/20 shadow-inner">
            <CalendarDays className="w-7 h-7 text-amber-300" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-purple-200 uppercase tracking-widest">
              Coordinación Interna • Tatiana • Gabriela • Paola
            </span>
            <h3 className="text-lg font-black tracking-tight">
              Cronograma de Actividades y Cuadro de Avisos
            </h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              Organización de tareas, inspecciones y recepciones con asignación directa y categorías personalizables.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadNotices}
            disabled={loading}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition disabled:opacity-50"
            title="Actualizar actividades"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs px-4 py-3 rounded-xl shadow-lg transition transform hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Publicar Nuevo Aviso / Actividad</span>
          </button>
        </div>
      </div>

      {/* METRICAS Y FILTROS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
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

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Filtrar:</span>
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none max-w-[170px] truncate"
          >
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'Todas' ? 'Todas las categorías' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LISTA DE AVISOS TIPO TARJETAS */}
      <div className="space-y-3">
        {filteredNotices.length === 0 ? (
          <div className="text-center py-14 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            No hay avisos registrados en esta categoría. Publica uno para coordinar con el equipo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotices.map((notice) => {
              const isPast = new Date(notice.date + 'T23:59:59') < new Date() && !notice.completed;
              const respClass = getResponsibleBadge(notice.responsible);

              return (
                <div
                  key={notice.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between space-y-3 transition ${
                    notice.completed 
                      ? 'border-emerald-200 bg-emerald-50/20' 
                      : isPast 
                      ? 'border-amber-300 bg-amber-50/20' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-800 border-slate-200 truncate max-w-[140px]" title={notice.category}>
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
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {notice.date}
                      </span>
                      <span 
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${respClass} truncate max-w-[160px]`} 
                        title={`Encargada: ${notice.responsible}`}
                      >
                        <User className="w-3 h-3" />
                        {notice.responsible}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <button
                        onClick={() => handleToggleComplete(notice.id)}
                        className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition ${
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
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Eliminar aviso"
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

      {/* MODAL CREAR AVISO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 flex justify-between items-center">
              <div>
                <h4 className="text-base font-black tracking-tight">Publicar Aviso / Coordinar Actividad</h4>
                <p className="text-xs text-purple-200">Asigna la responsable y programa la fecha en el cronograma</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">
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
                  placeholder="Ej. Recepción de lote de agua Aquabel / Entrega de EPP Mantenimiento"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  required
                />
              </div>

              {/* RESPONSABLE Y FECHA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Responsable / Encargada *
                  </label>
                  <select
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 bg-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="Tatiana Torres">Tatiana Torres (Supervisión)</option>
                    <option value="Gabriela">Gabriela (Seguridad Industrial)</option>
                    <option value="Paola">Paola (Salud Ocupacional)</option>
                    <option value="Todas / Equipo">Todas / Equipo</option>
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
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
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
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold bg-white focus:outline-none focus:border-indigo-600"
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
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold bg-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="Alta">Alta (Urgente)</option>
                    <option value="Media">Media</option>
                    <option value="Informativa">Informativa</option>
                  </select>
                </div>
              </div>

              {/* CAMPO SI ELIGE OTRO EN CATEGORÍA */}
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
                  className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow transition"
                >
                  Publicar en Cronograma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
