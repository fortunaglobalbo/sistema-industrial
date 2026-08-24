'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, RefreshCw, Printer, Trash2, Edit2, 
  Search, ArrowLeft, Calendar, Send, CheckCircle2, 
  Clock, BookOpen, Settings2, Sliders, Tag, Sparkles,
  AlertTriangle, Hash, Wand2, ArrowRight, Check
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  saveOfficialCite, 
  getOfficialCites, 
  deleteOfficialCite,
  getNextCiteCorrelative
} from '@/app/actions/cites';
import { 
  OfficialCiteInput, 
  OfficialCiteData, 
  CITE_STATUS_OPTIONS 
} from '@/lib/citeTypes';

interface ModuloCitesProps {
  showTabs?: boolean;
}

export default function ModuloCites({ showTabs = true }: ModuloCitesProps) {
  const [cites, setCites] = useState<OfficialCiteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');

  // Vistas: 'list' | 'form' | 'builder' | 'print'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'builder' | 'print'>('list');

  // Form State (Limpio y directo)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correlativeNumber, setCorrelativeNumber] = useState<number | string>('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [docNumber, setDocNumber] = useState('');
  const [reference, setReference] = useState('');
  const [recipientA, setRecipientA] = useState('');
  const [status, setStatus] = useState<string>('Enviado');
  const [customStatus, setCustomStatus] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Constructor de CITE Personalizado (Aislado)
  const [builderSigla, setBuilderSigla] = useState('EDO-IB');
  const [builderCorrelative, setBuilderCorrelative] = useState<number | string>('');
  const [builderDate, setBuilderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [builderFormat, setBuilderFormat] = useState<'SIGLA_NUM_MES_ANIO' | 'SIGLA_NUM_ANIO' | 'SIGLA_SLASH_ANIO' | 'MANUAL'>('SIGLA_NUM_MES_ANIO');
  const [builderDigits, setBuilderDigits] = useState<number>(3); // 001
  const [builderPreview, setBuilderPreview] = useState('');

  // Parámetros personalizables del Reporte Imprimible
  const [printTitle, setPrintTitle] = useState('ENDE DEORURO - DEPARTAMENTO DE SEGURIDAD INDUSTRIAL');
  const [printSubtitle, setPrintSubtitle] = useState('LIBRO OFICIAL DE CITES Y CORRESPONDENCIA ENVIADA A GERENCIA');
  const [printSignLeft, setPrintSignLeft] = useState('RESPONSABLE DE SEGURIDAD INDUSTRIAL');
  const [printSignRight, setPrintSignRight] = useState('RECEPCIÓN DE GERENCIA GENERAL');
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  // Sugerencias de Siglas de la empresa
  const quickSiglas = [
    'EDO-IB',
    'EDO-SI',
    'CITE-SI',
    'NOTA-SI',
    'INF-SI',
    'MEMO-SI',
    'EDO-GG'
  ];

  // Sugerencias de destinatarios (A)
  const quickRecipients = [
    'GERENCIA GENERAL',
    'GERENCIA TÉCNICA',
    'GERENCIA COMERCIAL',
    'GERENCIA ADMINISTRATIVA Y FINANCIERA',
    'JEFATURA DE RECURSOS HUMANOS',
    'SUPERVISIÓN DE SEGURIDAD INDUSTRIAL',
    'SECRETARÍA DE GERENCIA'
  ];

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  // Generador reactivo en el Constructor de CITE
  useEffect(() => {
    const dateObj = builderDate ? new Date(builderDate + 'T00:00:00') : new Date();
    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yearFullStr = String(dateObj.getFullYear());
    const yearShortStr = yearFullStr.slice(-2);
    const numStr = String(builderCorrelative || 1).padStart(builderDigits, '0');
    const cleanSigla = (builderSigla || 'CITE').trim().toUpperCase();

    let generated = '';
    if (builderFormat === 'SIGLA_NUM_MES_ANIO') {
      // EDO-IB-001/04/26 o EDO-IB-001/08/26
      generated = `${cleanSigla}-${numStr}/${monthStr}/${yearShortStr}`;
    } else if (builderFormat === 'SIGLA_NUM_ANIO') {
      // EDO-IB-001/2026
      generated = `${cleanSigla}-${numStr}/${yearFullStr}`;
    } else if (builderFormat === 'SIGLA_SLASH_ANIO') {
      // CITE-SI/001/2026
      generated = `${cleanSigla}/${numStr}/${yearFullStr}`;
    } else {
      generated = `${cleanSigla}-${numStr}`;
    }

    setBuilderPreview(generated);
  }, [builderSigla, builderCorrelative, builderDate, builderFormat, builderDigits]);

  const loadData = async () => {
    setLoading(true);
    const list = await getOfficialCites(searchTerm, filterStatus);
    setCites(list);
    setLoading(false);
  };

  // Abrir Constructor Independiente
  const handleOpenBuilder = async () => {
    const nextNum = await getNextCiteCorrelative();
    setBuilderCorrelative(nextNum);
    const todayStr = new Date().toISOString().split('T')[0];
    setBuilderDate(todayStr);
    setViewMode('builder');
  };

  // Aplicar CITE construido y pasar al formulario de Registro
  const handleApplyBuilderToForm = () => {
    setEditingId(null);
    setCorrelativeNumber(builderCorrelative);
    setIssueDate(builderDate);
    setDocNumber(builderPreview);
    setReference('');
    setRecipientA('GERENCIA GENERAL');
    setStatus('Enviado');
    setCustomStatus('');
    setObservations('');
    setViewMode('form');
  };

  // Abrir Registro Directo
  const handleOpenNew = async () => {
    setEditingId(null);
    const nextNum = await getNextCiteCorrelative();
    setCorrelativeNumber(nextNum);
    const todayStr = new Date().toISOString().split('T')[0];
    setIssueDate(todayStr);
    
    // Si ya había un código previo o sugerir uno estándar
    const dateObj = new Date();
    const mStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yStr = String(dateObj.getFullYear()).slice(-2);
    setDocNumber(`EDO-IB-${String(nextNum).padStart(3, '0')}/${mStr}/${yStr}`);
    
    setReference('');
    setRecipientA('GERENCIA GENERAL');
    setStatus('Enviado');
    setCustomStatus('');
    setObservations('');
    setViewMode('form');
  };

  const handleEdit = (item: OfficialCiteData) => {
    setEditingId(item.id);
    setCorrelativeNumber(item.correlative_number);
    setIssueDate(item.issue_date);
    setDocNumber(item.doc_number);
    setReference(item.reference);
    setRecipientA(item.recipient_a);
    
    if (CITE_STATUS_OPTIONS.includes(item.status as any)) {
      setStatus(item.status);
      setCustomStatus('');
    } else {
      setStatus('OTRO');
      setCustomStatus(item.status);
    }

    setObservations(item.observations || '');
    setViewMode('form');
  };

  const executeSave = async (numToUse?: number) => {
    if (!docNumber.trim()) {
      Swal.fire({ icon: 'warning', title: 'N° Documento Obligatorio', text: 'Ingrese el número de CITE o documento.' });
      return;
    }
    if (!reference.trim()) {
      Swal.fire({ icon: 'warning', title: 'Referencia Obligatoria', text: 'Ingrese el asunto o referencia del documento.' });
      return;
    }
    if (!recipientA.trim()) {
      Swal.fire({ icon: 'warning', title: 'Destinatario (A) Obligatorio', text: 'Especifique a quién va dirigido.' });
      return;
    }

    const finalStatus = status === 'OTRO' ? (customStatus.trim() || 'Enviado') : status;
    const finalCorrNum = numToUse || (correlativeNumber ? Number(correlativeNumber) : undefined);

    setIsSubmitting(true);
    const payload: OfficialCiteInput = {
      correlativeNumber: finalCorrNum,
      issueDate,
      docNumber: docNumber.trim(),
      reference: reference.trim(),
      recipientA: recipientA.trim(),
      signerFirm: '',
      status: finalStatus,
      observations: observations.trim() || undefined
    };

    const res = await saveOfficialCite(payload, editingId || undefined);
    setIsSubmitting(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: editingId ? 'CITE Actualizado' : 'CITE Registrado con Éxito',
        text: `El documento ${docNumber.toUpperCase()} con N° Correlativo #${finalCorrNum} ha sido guardado correctamente.`,
        timer: 2200,
        showConfirmButton: false
      });
      loadData();
      setViewMode('list');
    } else if (res.isDuplicate) {
      // Manejo amigable en español para duplicados
      const result = await Swal.fire({
        icon: 'warning',
        title: 'N° Correlativo Duplicado',
        html: `
          <p class="text-sm text-slate-700 mb-2">El número correlativo <strong>#${finalCorrNum}</strong> ya está registrado en otro CITE.</p>
          <p class="text-xs text-blue-800 font-bold bg-blue-50 p-2.5 rounded-xl">¿Deseas asignar automáticamente el siguiente número disponible: <strong>#${res.nextAvailable}</strong>?</p>
        `,
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        confirmButtonText: `Sí, usar #${res.nextAvailable} y guardar`,
        cancelButtonText: 'Corregir manualmente'
      });

      if (result.isConfirmed) {
        setCorrelativeNumber(res.nextAvailable);
        executeSave(res.nextAvailable);
      }
    } else {
      Swal.fire({ 
        icon: 'error', 
        title: 'Error al Guardar CITE', 
        text: res.error || 'Ocurrió un inconveniente al registrar el documento.' 
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSave();
  };

  const handleDelete = async (id: string, docNum: string) => {
    const confirm = await Swal.fire({
      title: `¿Eliminar CITE ${docNum}?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteOfficialCite(id);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
        loadData();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  const filteredCites = cites.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.doc_number.toLowerCase().includes(term) ||
      c.reference.toLowerCase().includes(term) ||
      c.recipient_a.toLowerCase().includes(term) ||
      String(c.correlative_number).includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* VISTA 1: LISTADO DE CITES */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* BANNER DE RESUMEN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-5 rounded-2xl shadow-md flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-blue-100">Total CITES Registrados</p>
                <p className="text-3xl font-black font-mono">{cites.length}</p>
                <p className="text-[11px] text-blue-200">Libro Oficial Correlativo</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Firmados / Aceptados</p>
                <p className="text-2xl font-black font-mono text-emerald-950">
                  {cites.filter(c => c.status === 'Firmado' || c.status === 'Aprobado').length}
                </p>
                <p className="text-[11px] text-emerald-700 font-bold">Con visto bueno</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Enviados</p>
                <p className="text-2xl font-black font-mono text-blue-950">
                  {cites.filter(c => c.status === 'Enviado').length}
                </p>
                <p className="text-[11px] text-blue-700 font-bold">Remitidos a Gerencia</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">En Trámite / Otros</p>
                <p className="text-2xl font-black font-mono text-amber-950">
                  {cites.filter(c => c.status === 'En Trámite' || c.status === 'Observado').length}
                </p>
                <p className="text-[11px] text-amber-700 font-bold">Pendientes de respuesta</p>
              </div>
            </div>

          </div>

          {/* BARRA DE ACCIONES Y BÚSQUEDA */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por N° CITE, sigla, referencia o destinatario (A)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-black text-slate-800 uppercase"
              >
                <option value="TODOS">TODOS LOS ESTADOS</option>
                {CITE_STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* BOTONES DE ACCIÓN: CONSTRUCTOR Y REGISTRAR */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewMode('print')}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-3.5 py-3 rounded-xl transition shadow"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Libro</span>
              </button>

              {/* BOTÓN INDEPENDIENTE PARA EL CONSTRUCTOR DE CITES */}
              <button
                onClick={handleOpenBuilder}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow-md hover:shadow-indigo-200"
                title="Construir formato de CITE personalizado (Siglas + Mes + Año)"
              >
                <Wand2 className="w-4 h-4 text-amber-300" />
                <span>Construir CITE</span>
              </button>

              {/* BOTÓN DIRECTO DE REGISTRO */}
              <button
                onClick={handleOpenNew}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow-lg"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>+ Registrar CITE</span>
              </button>
            </div>

          </div>

          {/* TABLA DE CITES */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Control y Libro de CITES a Gerencia ({filteredCites.length})
              </h3>

              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                title="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-xs font-bold text-slate-500">Cargando CITES...</div>
            ) : filteredCites.length === 0 ? (
              <div className="text-center py-14 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                No se encontraron CITES registrados con los filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-xs">
                      <th className="p-3 text-center w-14">Nro</th>
                      <th className="p-3 text-center w-24">Fecha</th>
                      <th className="p-3">Número Documento</th>
                      <th className="p-3">Referencia / Asunto</th>
                      <th className="p-3">A (Destinatario)</th>
                      <th className="p-3 text-center">Firma</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-center w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {filteredCites.map((cite) => (
                      <tr key={cite.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-mono font-black text-blue-700 bg-blue-50/40">
                          #{cite.correlative_number}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-700 text-xs">
                          {cite.issue_date}
                        </td>
                        <td className="p-3 font-mono font-black text-slate-900 text-xs">
                          {cite.doc_number}
                        </td>
                        <td className="p-3 uppercase text-slate-900 text-xs max-w-xs">
                          <p className="line-clamp-2">{cite.reference}</p>
                          {cite.observations && (
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">Obs: {cite.observations}</p>
                          )}
                        </td>
                        <td className="p-3 uppercase text-slate-800 text-xs font-black">
                          {cite.recipient_a}
                        </td>
                        <td className="p-3 text-center text-xs text-slate-400 font-normal">
                          <span className="italic text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            ✍️ Por firmar
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                            cite.status === 'Firmado' || cite.status === 'Aprobado'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : cite.status === 'Enviado' 
                              ? 'bg-blue-50 text-blue-800 border-blue-300' 
                              : cite.status === 'En Trámite' 
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}>
                            {cite.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(cite)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200"
                              title="Editar CITE"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cite.id, cite.doc_number)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                              title="Eliminar CITE"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      )}

      {/* VISTA 2: CONSTRUCTOR / ESTUDIO DE CITES PERSONALIZADOS (Aislado, Intuitivo y Fácil) */}
      {viewMode === 'builder' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-indigo-200 shadow-xl space-y-6 max-w-4xl mx-auto">
          
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl shadow-inner">
                <Wand2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
                  Constructor de CITES Personalizados
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  Configura la sigla, correlativo, detección automática de mes y año con vista previa en tiempo real
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-4 py-2 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          </div>

          {/* CAJA PRINCIPAL DE VISTA PREVIA */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl text-center space-y-2 shadow-lg border border-indigo-500/30">
            <span className="text-[11px] font-mono font-bold text-indigo-300 uppercase tracking-widest block">
              Vista Previa del Código CITE Generado:
            </span>
            <p className="text-2xl sm:text-4xl font-black font-mono text-amber-300 tracking-wider break-all">
              {builderPreview || 'EDO-IB-001/08/26'}
            </p>
            <p className="text-xs text-slate-400">
              Formato automático basado en tus siglas y fecha seleccionada
            </p>
          </div>

          {/* OPCIONES DE CONFIGURACIÓN DEL CONSTRUCTOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            
            {/* 1. SIGLA O PREFIJO */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                1. Sigla / Prefijo del Documento:
              </label>
              <input
                type="text"
                value={builderSigla}
                onChange={(e) => setBuilderSigla(e.target.value)}
                placeholder="EJ. EDO-IB, EDO-SI, NOTA..."
                className="w-full bg-white border-2 border-indigo-300 text-slate-900 text-sm font-black font-mono uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-600"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-bold self-center">Fijar:</span>
                {quickSiglas.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBuilderSigla(s)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                      builderSigla === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 hover:bg-indigo-50 border-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. FECHA Y DETECCIÓN AUTOMÁTICA DE MES/AÑO */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                2. Fecha del CITE (Extrae Mes y Año):
              </label>
              <input
                type="date"
                value={builderDate}
                onChange={(e) => setBuilderDate(e.target.value)}
                className="w-full bg-white border-2 border-blue-300 text-slate-900 text-sm font-black rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600"
              />
              <div className="flex justify-between text-[11px] font-bold text-slate-600 pt-1 font-mono">
                <span>Mes detectado: <strong>{builderDate ? String(new Date(builderDate + 'T00:00:00').getMonth() + 1).padStart(2, '0') : '--'}</strong></span>
                <span>Año detectado: <strong>{builderDate ? String(new Date(builderDate + 'T00:00:00').getFullYear()).slice(-2) : '--'}</strong></span>
              </div>
            </div>

            {/* 3. N° CORRELATIVO Y DÍGITOS */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-emerald-600" />
                3. Número Correlativo y Formato:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={builderCorrelative}
                  onChange={(e) => setBuilderCorrelative(e.target.value)}
                  placeholder="Ej. 1, 45..."
                  className="flex-1 bg-white border-2 border-emerald-300 text-slate-900 text-sm font-black font-mono rounded-xl px-4 py-2.5"
                />
                <select
                  value={builderDigits}
                  onChange={(e) => setBuilderDigits(Number(e.target.value))}
                  className="bg-white border-2 border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value={3}>3 dígitos (001)</option>
                  <option value={2}>2 dígitos (01)</option>
                  <option value={1}>1 dígito (1)</option>
                </select>
              </div>
            </div>

            {/* 4. ESTILO DE ESTRUCTURA */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-600" />
                4. Estilo de Separadores:
              </label>
              <select
                value={builderFormat}
                onChange={(e) => setBuilderFormat(e.target.value as any)}
                className="w-full bg-white border-2 border-purple-300 text-slate-900 text-xs font-black rounded-xl px-4 py-2.5"
              >
                <option value="SIGLA_NUM_MES_ANIO">SIGLA-NRO/MES/AÑO (ej. EDO-IB-001/04/26)</option>
                <option value="SIGLA_NUM_ANIO">SIGLA-NRO/AÑO (ej. EDO-IB-001/2026)</option>
                <option value="SIGLA_SLASH_ANIO">SIGLA/NRO/AÑO (ej. CITE-SI/001/2026)</option>
              </select>
            </div>

          </div>

          {/* BOTONES DE ACCIÓN DEL CONSTRUCTOR */}
          <div className="pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs sm:text-sm px-6 py-3 rounded-xl transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleApplyBuilderToForm}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-xs sm:text-sm px-8 py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <span>Usar este CITE y Pasar al Registro</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </div>

        </div>
      )}

      {/* VISTA 3: FORMULARIO DE REGISTRO (Limpio, Rápido y Directo) */}
      {viewMode === 'form' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xl space-y-6 max-w-4xl mx-auto">
          
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
                  {editingId ? `Editar CITE: ${docNumber}` : 'Registrar CITE a Gerencia'}
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  Ingresa los detalles del documento para registrarlo en el libro oficial
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-4 py-2 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            
            {/* Nro Correlativo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                N° Correlativo
              </label>
              <input
                type="number"
                min="1"
                placeholder="Ej. 1, 2, 45..."
                value={correlativeNumber}
                onChange={(e) => setCorrelativeNumber(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-blue-700 text-sm font-black font-mono rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Fecha de Emisión <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Número de Documento / CITE con botón al constructor */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-slate-900 uppercase">
                  Número de CITE / Documento <span className="text-red-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleOpenBuilder}
                  className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Abrir Constructor</span>
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="EJ. EDO-IB-001/04/26, CITE-SI-045/2026..."
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black font-mono uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* A (Destinatario / Gerencia) con chips de sugerencia rápida */}
            <div className="space-y-1.5 sm:col-span-4">
              <label className="block text-xs font-black text-slate-900 uppercase">
                A (Destinatario / Gerencia) <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="EJ. GERENCIA GENERAL, GERENCIA TÉCNICA, DR. NOMBRE APELLIDO..."
                value={recipientA}
                onChange={(e) => setRecipientA(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-bold self-center">Sugerencias:</span>
                {quickRecipients.map((rec) => (
                  <button
                    key={rec}
                    type="button"
                    onClick={() => setRecipientA(rec)}
                    className="text-[10px] font-bold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 px-2 py-1 rounded-lg transition"
                  >
                    {rec}
                  </button>
                ))}
              </div>
            </div>

            {/* Referencia / Asunto */}
            <div className="space-y-1.5 sm:col-span-4">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Referencia / Asunto <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="EJ. REMISIÓN DE INFORME MENSUAL DE SEGURIDAD INDUSTRIAL Y CONTROL DE EPP..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Estado del Trámite */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Estado del Trámite
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs sm:text-sm font-black rounded-xl px-4 py-3 uppercase"
              >
                {CITE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="OTRO">OTRO (PERSONALIZADO)...</option>
              </select>

              {status === 'OTRO' && (
                <input
                  type="text"
                  placeholder="Especifique el estado..."
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  className="w-full bg-white border-2 border-blue-400 text-slate-900 text-xs font-black rounded-xl px-4 py-2 mt-2 uppercase"
                />
              )}
            </div>

            {/* Observaciones / Anexos */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Observaciones / Anexos (Opcional)
              </label>
              <input
                type="text"
                placeholder="EJ. ADJUNTA 3 HOJAS Y PLANILLA DE RESPALDO..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3"
              />
            </div>

          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-5 py-3 rounded-xl transition text-xs sm:text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-7 py-3 rounded-xl transition shadow-lg text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar CITE</span>
              )}
            </button>
          </div>

        </form>
      )}

      {/* VISTA 4: PLANILLA OFICIAL IMPRIMIBLE */}
      {viewMode === 'print' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-blue-50 border border-blue-200 p-4 rounded-2xl shadow-sm print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al Listado</span>
              </button>

              <button
                onClick={() => setShowPrintSettings(!showPrintSettings)}
                className="flex items-center gap-1.5 bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 px-3 py-2 rounded-xl text-xs font-bold transition"
              >
                <Settings2 className="w-4 h-4" />
                <span>Personalizar Encabezados y Firmas</span>
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-black shadow-lg transition"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>IMPRIMIR LIBRO DE CITES</span>
            </button>
          </div>

          {/* PANEL DE PERSONALIZACIÓN DEL REPORTE */}
          {showPrintSettings && (
            <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-md space-y-4 print:hidden">
              <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Personalizar Textos del Reporte Imprimible
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Título Institucional:</label>
                  <input
                    type="text"
                    value={printTitle}
                    onChange={(e) => setPrintTitle(e.target.value)}
                    className="w-full border rounded-lg p-2 font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subtítulo / Nombre del Libro:</label>
                  <input
                    type="text"
                    value={printSubtitle}
                    onChange={(e) => setPrintSubtitle(e.target.value)}
                    className="w-full border rounded-lg p-2 font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pie de Firma Izquierda:</label>
                  <input
                    type="text"
                    value={printSignLeft}
                    onChange={(e) => setPrintSignLeft(e.target.value)}
                    className="w-full border rounded-lg p-2 font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pie de Firma Derecha:</label>
                  <input
                    type="text"
                    value={printSignRight}
                    onChange={(e) => setPrintSignRight(e.target.value)}
                    className="w-full border rounded-lg p-2 font-bold uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENTO OFICIAL IMPRIMIBLE */}
          <div className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-xl max-w-5xl mx-auto print:shadow-none print:border-none print:w-full print:p-0 font-sans">
            
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center gap-4">
                <img 
                  src="/logo-ende.png" 
                  alt="ENDE DEORURO" 
                  className="h-12 w-auto object-contain"
                />
                <div>
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">{printTitle}</h2>
                  <p className="text-xs font-extrabold text-blue-800 uppercase tracking-wide">{printSubtitle}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1.5 rounded uppercase">
                  REGISTRO CORRELATIVO
                </span>
                <p className="text-[10px] text-slate-500 font-bold mt-1 font-mono">
                  EMISIÓN: {new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-left">
                    <th className="p-2.5 text-center w-12 border border-slate-900">NRO</th>
                    <th className="p-2.5 text-center w-24 border border-slate-900">FECHA</th>
                    <th className="p-2.5 w-36 border border-slate-900">NÚMERO DOCUMENTO</th>
                    <th className="p-2.5 border border-slate-900">REFERENCIA / ASUNTO</th>
                    <th className="p-2.5 border border-slate-900 w-48">A (DESTINATARIO)</th>
                    <th className="p-2.5 border border-slate-900 w-44 text-center">FIRMA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 border border-slate-300 font-bold">
                  {cites.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono font-black border-r border-slate-300">
                        {c.correlative_number}
                      </td>
                      <td className="p-2.5 text-center font-mono text-xs border-r border-slate-300">
                        {c.issue_date}
                      </td>
                      <td className="p-2.5 font-mono font-black text-xs border-r border-slate-300">
                        {c.doc_number}
                      </td>
                      <td className="p-2.5 uppercase text-[11px] border-r border-slate-300">
                        <p>{c.reference}</p>
                        {c.observations && (
                          <p className="text-[9px] text-slate-500 font-normal mt-0.5">Obs: {c.observations}</p>
                        )}
                      </td>
                      <td className="p-2.5 uppercase text-[11px] border-r border-slate-300 font-black">
                        {c.recipient_a}
                      </td>
                      {/* CELDA DE FIRMA FÍSICA EN BLANCO PARA IMPRIMIR */}
                      <td className="p-4 border-r border-slate-300 min-h-[3.5rem] text-center">
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-10 text-center text-xs sm:text-sm">
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">{printSignLeft}</p>
                <p className="text-xs text-slate-600 font-bold uppercase">ENDE DEORURO</p>
              </div>
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">{printSignRight}</p>
                <p className="text-xs text-slate-600 font-bold uppercase">ENDE DEORURO</p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
