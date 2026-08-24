'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, RefreshCw, Printer, Trash2, Edit2, 
  Search, ArrowLeft, Calendar, Send, CheckCircle2, 
  Clock, BookOpen, Settings2, Sliders, Tag, Sparkles
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  saveOfficialCite, 
  getOfficialCites, 
  deleteOfficialCite 
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

  // Vistas: 'list' | 'form' | 'print'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'print'>('list');

  // Form State (100% Personalizable)
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

  // Parámetros personalizables del Reporte Imprimible
  const [printTitle, setPrintTitle] = useState('ENDE DEORURO - DEPARTAMENTO DE SEGURIDAD INDUSTRIAL');
  const [printSubtitle, setPrintSubtitle] = useState('LIBRO OFICIAL DE CITES Y CORRESPONDENCIA ENVIADA A GERENCIA');
  const [printSignLeft, setPrintSignLeft] = useState('RESPONSABLE DE SEGURIDAD INDUSTRIAL');
  const [printSignRight, setPrintSignRight] = useState('RECEPCIÓN DE GERENCIA GENERAL');
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  // Sugerencias rápidas para el destinatario (A)
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

  const loadData = async () => {
    setLoading(true);
    const list = await getOfficialCites(searchTerm, filterStatus);
    setCites(list);
    setLoading(false);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    const currentYear = new Date().getFullYear();
    const nextNum = cites.length + 1;
    setCorrelativeNumber(nextNum);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDocNumber(`CITE-SI-${String(nextNum).padStart(3, '0')}/${currentYear}`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setIsSubmitting(true);
    const payload: OfficialCiteInput = {
      correlativeNumber: correlativeNumber ? Number(correlativeNumber) : undefined,
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
        title: editingId ? 'CITE Actualizado' : 'CITE Registrado',
        text: `El documento ${docNumber.toUpperCase()} ha sido registrado correctamente.`,
        timer: 2000,
        showConfirmButton: false
      });
      loadData();
      setViewMode('list');
    } else {
      Swal.fire({ icon: 'error', title: 'Error al Guardar', text: res.error });
    }
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
                  placeholder="Buscar por N° CITE, referencia o destinatario (A)..."
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('print')}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Libro de CITES</span>
              </button>

              <button
                onClick={handleOpenNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow-lg"
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
                      <th className="p-3 text-center w-12">Nro</th>
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

      {/* VISTA 2: FORMULARIO 100% PERSONALIZABLE */}
      {viewMode === 'form' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xl space-y-6">
          
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
                  {editingId ? `Editar CITE: ${docNumber}` : 'Registrar Nuevo CITE Personalizable'}
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  Todos los campos son editables libremente según el formato de tu documento
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
            
            {/* Nro Correlativo Personalizable */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Nro Correlativo
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

            {/* Número de Documento / CITE */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-slate-900 uppercase">
                  Número de Documento / CITE <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-1 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDocNumber(`CITE-SI-${String(correlativeNumber || 1).padStart(3, '0')}/${new Date().getFullYear()}`)}
                    className="text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded"
                  >
                    + CITE-SI
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocNumber(`NOTA-SI-${String(correlativeNumber || 1).padStart(3, '0')}/${new Date().getFullYear()}`)}
                    className="text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded"
                  >
                    + NOTA
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocNumber(`INF-SI-${String(correlativeNumber || 1).padStart(3, '0')}/${new Date().getFullYear()}`)}
                    className="text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded"
                  >
                    + INF
                  </button>
                </div>
              </div>
              <input
                type="text"
                required
                placeholder="EJ. CITE-SI-045/2026, NOTA GG-012, INFORME-01..."
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
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
                onChange={(e) => setRecipientA(e.target.value.toUpperCase())}
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
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Estado del Trámite (Seleccionable o Personalizado) */}
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
                  onChange={(e) => setCustomStatus(e.target.value.toUpperCase())}
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
                onChange={(e) => setObservations(e.target.value.toUpperCase())}
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
              className="bg-slate-900 hover:bg-slate-800 text-white font-black px-7 py-3 rounded-xl transition shadow-lg text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
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

      {/* VISTA 3: PLANILLA OFICIAL IMPRIMIBLE CON PERSONALIZACIÓN DE ENCABEZADO */}
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
                    onChange={(e) => setPrintTitle(e.target.value.toUpperCase())}
                    className="w-full border rounded-lg p-2 font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subtítulo / Nombre del Libro:</label>
                  <input
                    type="text"
                    value={printSubtitle}
                    onChange={(e) => setPrintSubtitle(e.target.value.toUpperCase())}
                    className="w-full border rounded-lg p-2 font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pie de Firma Izquierda:</label>
                  <input
                    type="text"
                    value={printSignLeft}
                    onChange={(e) => setPrintSignLeft(e.target.value.toUpperCase())}
                    className="w-full border rounded-lg p-2 font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pie de Firma Derecha:</label>
                  <input
                    type="text"
                    value={printSignRight}
                    onChange={(e) => setPrintSignRight(e.target.value.toUpperCase())}
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
