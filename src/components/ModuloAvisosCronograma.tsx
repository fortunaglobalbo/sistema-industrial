'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, Plus, CheckCircle2, Clock, 
  AlertCircle, Trash2, Calendar, User, Tag, 
  MessageSquare, Sparkles, Filter, Check
} from 'lucide-react';
import Swal from 'sweetalert2';

export interface SafetyNotice {
  id: string;
  title: string;
  date: string;
  responsible: string;
  category: 'Inspección' | 'Recepción Agua' | 'Entrega EPP' | 'Reunión' | 'Auditoría' | 'General';
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
    responsible: 'Dra. Tatiana / Salud Ocupacional',
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
    responsible: 'Equipo de Seguridad Industrial',
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
    responsible: 'Dra. Tatiana Torres',
    category: 'Entrega EPP',
    priority: 'Media',
    notes: 'Entrega de kits vehiculares revisados con insumos vigentes.',
    completed: false,
    createdAt: new Date().toISOString()
  }
];

export default function ModuloAvisosCronograma() {
  const [notices, setNotices] = useState<SafetyNotice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('Todas');

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [responsible, setResponsible] = useState('Salud Ocupacional / Seguridad Industrial');
  const [category, setCategory] = useState<SafetyNotice['category']>('General');
  const [priority, setPriority] = useState<SafetyNotice['priority']>('Media');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = () => {
    try {
      const saved = localStorage.getItem('safety_team_notices_v1');
      if (saved) {
        setNotices(JSON.parse(saved));
      } else {
        setNotices(DEFAULT_NOTICES);
        localStorage.setItem('safety_team_notices_v1', JSON.stringify(DEFAULT_NOTICES));
      }
    } catch (e) {
      setNotices(DEFAULT_NOTICES);
    }
  };

  const saveNoticesToStorage = (updated: SafetyNotice[]) => {
    setNotices(updated);
    localStorage.setItem('safety_team_notices_v1', JSON.stringify(updated));
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      Swal.fire({ icon: 'warning', title: 'Título requerido', text: 'Especifique la actividad o aviso a coordinar.' });
      return;
    }

    const newNotice: SafetyNotice = {
      id: `notice-${Date.now()}`,
      title: title.trim(),
      date,
      responsible: responsible.trim(),
      category,
      priority,
      notes: notes.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    const updated = [newNotice, ...notices];
    saveNoticesToStorage(updated);

    Swal.fire({
      icon: 'success',
      title: 'Aviso Publicado',
      text: 'La actividad ha sido programada en el cronograma visible para todo el equipo.',
      timer: 1800,
      showConfirmButton: false
    });

    setTitle('');
    setNotes('');
    setShowModal(false);
  };

  const handleToggleComplete = (id: string) => {
    const updated = notices.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n));
    saveNoticesToStorage(updated);
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
    }).then((res) => {
      if (res.isConfirmed) {
        const updated = notices.filter((n) => n.id !== id);
        saveNoticesToStorage(updated);
      }
    });
  };

  const filteredNotices = notices.filter((n) => {
    if (filterCategory === 'Todas') return true;
    return n.category === filterCategory;
  });

  const pendingCount = notices.filter((n) => !n.completed).length;
  const completedCount = notices.filter((n) => n.completed).length;

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
              Coordinación Interna de Salud y Seguridad
            </span>
            <h3 className="text-lg font-black tracking-tight">
              Cronograma de Actividades y Cuadro de Avisos
            </h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              Organización de tareas, recepciones e inspecciones entre compañeras para no depender de mensajes sueltos de WhatsApp.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs px-4 py-3 rounded-xl shadow-lg transition transform hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Publicar Nuevo Aviso / Actividad</span>
        </button>
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
            className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="Todas">Todas las áreas</option>
            <option value="Recepción Agua">Recepción Agua</option>
            <option value="Entrega EPP">Entrega EPP</option>
            <option value="Inspección">Inspección</option>
            <option value="Reunión">Reunión</option>
            <option value="Auditoría">Auditoría</option>
            <option value="General">General</option>
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
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        notice.category === 'Recepción Agua' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : notice.category === 'Entrega EPP' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : notice.category === 'Inspección' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
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
                      <span className="flex items-center gap-1 truncate max-w-[140px]" title={notice.responsible}>
                        <User className="w-3 h-3 text-slate-400" />
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
                <h4 className="text-base font-black tracking-tight">Publicar Aviso / Coordinar Fecha</h4>
                <p className="text-xs text-purple-200">Visible inmediatamente para todas las compañeras</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold bg-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="Recepción Agua">Recepción Agua</option>
                    <option value="Entrega EPP">Entrega EPP</option>
                    <option value="Inspección">Inspección</option>
                    <option value="Reunión">Reunión</option>
                    <option value="Auditoría">Auditoría</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">
                    Responsable / Encargada
                  </label>
                  <input
                    type="text"
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
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
