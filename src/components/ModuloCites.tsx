'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, RefreshCw, Printer, Trash2, Edit2, 
  Search, ArrowLeft, Calendar, Send, CheckCircle2, 
  Clock, BookOpen, Settings2, Sliders, Tag, Sparkles,
  AlertTriangle, Hash, Wand2, ArrowRight, Check, Palette,
  Save, Copy, BookmarkCheck, LayoutGrid
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

export interface SavedCiteTemplate {
  id: string;
  name: string;
  sigla: string;
  correlative: number;
  digits: number;
  formatStyle: 'MES_ANIO' | 'SOLO_ANIO';
  month: number;
  year: number;
  previewCode: string;
  updatedAt: string;
}

const MONTH_NAMES = [
  '01 - Enero', '02 - Febrero', '03 - Marzo', '04 - Abril',
  '05 - Mayo', '06 - Junio', '07 - Julio', '08 - Agosto',
  '09 - Septiembre', '10 - Octubre', '11 - Noviembre', '12 - Diciembre'
];

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

  // Constructor de CITEs (Simplificado: Solo Mes y Año, 3 sugerencias, almacenable y editable)
  const [builderEditingTemplateId, setBuilderEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('CITE GENERAL');
  const [builderSigla, setBuilderSigla] = useState('EDO-IB');
  const [builderCorrelative, setBuilderCorrelative] = useState<number>(1);
  const [builderDigits, setBuilderDigits] = useState<number>(3); // 001
  const [builderMonth, setBuilderMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [builderYear, setBuilderYear] = useState<number>(() => new Date().getFullYear());
  const [builderFormatStyle, setBuilderFormatStyle] = useState<'MES_ANIO' | 'SOLO_ANIO'>('MES_ANIO');
  const [builderPreview, setBuilderPreview] = useState('');

  // Formatos / CITES Almacenados en Constructor
  const [savedTemplates, setSavedTemplates] = useState<SavedCiteTemplate[]>([]);

  // Parámetros personalizables del Reporte Imprimible
  const [printTitle, setPrintTitle] = useState('ENDE DEORURO - DEPARTAMENTO DE SEGURIDAD INDUSTRIAL');
  const [printSubtitle, setPrintSubtitle] = useState('LIBRO OFICIAL DE CITES Y CORRESPONDENCIA ENVIADA A GERENCIA');
  const [printSignLeft, setPrintSignLeft] = useState('RESPONSABLE DE SEGURIDAD INDUSTRIAL');
  const [printSignRight, setPrintSignRight] = useState('RECEPCIÓN DE GERENCIA GENERAL');
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  // EXACTAMENTE 3 sugerencias de siglas solicitadas por el usuario
  const quickSiglas = [
    'EDO-IB',
    'EDO-SI',
    'CITE-SI'
  ];

  // Sugerencias de destinatarios (A)
  const quickRecipients = [
    'GERENCIA GENERAL',
    'GERENCIA TÉCNICA',
    'GERENCIA COMERCIAL',
    'GERENCIA ADMINISTRATIVA Y FINANCIERA',
    'JEFATURA DE RECURSOS HUMANOS',
    'SUPERVISIÓN DE SEGURIDAD INDUSTRIAL'
  ];

  // Cargar CITES de Supabase y plantillas guardadas de localStorage
  useEffect(() => {
    loadData();
    loadSavedTemplates();
  }, [filterStatus]);

  const loadSavedTemplates = () => {
    try {
      const stored = localStorage.getItem('ende_saved_cites_templates_v2');
      if (stored) {
        setSavedTemplates(JSON.parse(stored));
      } else {
        // Plantillas iniciales por defecto
        const initial: SavedCiteTemplate[] = [
          {
            id: 'tmpl-1',
            name: 'CITE Inspección y Bajas',
            sigla: 'EDO-IB',
            correlative: 1,
            digits: 3,
            formatStyle: 'MES_ANIO',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            previewCode: `EDO-IB-001/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`,
            updatedAt: new Date().toLocaleDateString()
          },
          {
            id: 'tmpl-2',
            name: 'CITE Seguridad Industrial',
            sigla: 'EDO-SI',
            correlative: 1,
            digits: 3,
            formatStyle: 'MES_ANIO',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            previewCode: `EDO-SI-001/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`,
            updatedAt: new Date().toLocaleDateString()
          },
          {
            id: 'tmpl-3',
            name: 'CITE Anual Simple',
            sigla: 'CITE-SI',
            correlative: 1,
            digits: 3,
            formatStyle: 'SOLO_ANIO',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            previewCode: `CITE-SI-001/${new Date().getFullYear()}`,
            updatedAt: new Date().toLocaleDateString()
          }
        ];
        setSavedTemplates(initial);
        localStorage.setItem('ende_saved_cites_templates_v2', JSON.stringify(initial));
      }
    } catch (e) {
      console.warn('Error loading saved templates', e);
    }
  };

  // Cálculo reactivo del código CITE generado en el Constructor
  useEffect(() => {
    const cleanSigla = (builderSigla || 'SIGLA').trim().toUpperCase();
    const numStr = String(builderCorrelative || 1).padStart(builderDigits, '0');
    const monthStr = String(builderMonth).padStart(2, '0');
    const yearShortStr = String(builderYear).slice(-2);
    const yearFullStr = String(builderYear);

    let generated = '';
    if (builderFormatStyle === 'MES_ANIO') {
      // Formato: EDO-IB-001/08/26
      generated = `${cleanSigla}-${numStr}/${monthStr}/${yearShortStr}`;
    } else {
      // Formato: EDO-IB-001/2026
      generated = `${cleanSigla}-${numStr}/${yearFullStr}`;
    }

    setBuilderPreview(generated);
  }, [builderSigla, builderCorrelative, builderDigits, builderMonth, builderYear, builderFormatStyle]);

  const loadData = async () => {
    setLoading(true);
    const list = await getOfficialCites(searchTerm, filterStatus);
    setCites(list);
    setLoading(false);
  };

  // Abrir Constructor Independiente
  const handleOpenBuilder = async () => {
    const nextNum = await getNextCiteCorrelative();
    setBuilderEditingTemplateId(null);
    setTemplateName('NUEVO FORMATO CITE');
    setBuilderSigla('EDO-IB');
    setBuilderCorrelative(nextNum);
    setBuilderDigits(3);
    setBuilderMonth(new Date().getMonth() + 1);
    setBuilderYear(new Date().getFullYear());
    setBuilderFormatStyle('MES_ANIO');
    setViewMode('builder');
  };

  // Guardar / Almacenar Formato de CITE en el Constructor
  const handleSaveTemplate = () => {
    const cleanName = templateName.trim() || `Formato ${builderSigla}`;
    const newTemplate: SavedCiteTemplate = {
      id: builderEditingTemplateId || `tmpl-${Date.now()}`,
      name: cleanName.toUpperCase(),
      sigla: builderSigla.trim().toUpperCase() || 'EDO-IB',
      correlative: Number(builderCorrelative) || 1,
      digits: builderDigits,
      formatStyle: builderFormatStyle,
      month: builderMonth,
      year: builderYear,
      previewCode: builderPreview,
      updatedAt: new Date().toLocaleDateString('es-BO')
    };

    let updatedList: SavedCiteTemplate[] = [];
    if (builderEditingTemplateId) {
      updatedList = savedTemplates.map(t => t.id === builderEditingTemplateId ? newTemplate : t);
      Swal.fire({
        icon: 'success',
        title: 'Formato Actualizado',
        text: `El formato "${newTemplate.name}" (${newTemplate.previewCode}) ha sido actualizado con éxito.`,
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      updatedList = [newTemplate, ...savedTemplates];
      Swal.fire({
        icon: 'success',
        title: 'CITE Almacenado',
        text: `El formato "${newTemplate.name}" (${newTemplate.previewCode}) ha sido guardado en tus CITES.`,
        timer: 2000,
        showConfirmButton: false
      });
    }

    setSavedTemplates(updatedList);
    localStorage.setItem('ende_saved_cites_templates_v2', JSON.stringify(updatedList));
    setBuilderEditingTemplateId(newTemplate.id);
  };

  // Cargar formato existente para editarlo en el Constructor
  const handleEditTemplate = (tmpl: SavedCiteTemplate) => {
    setBuilderEditingTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setBuilderSigla(tmpl.sigla);
    setBuilderCorrelative(tmpl.correlative);
    setBuilderDigits(tmpl.digits || 3);
    setBuilderMonth(tmpl.month || new Date().getMonth() + 1);
    setBuilderYear(tmpl.year || new Date().getFullYear());
    setBuilderFormatStyle(tmpl.formatStyle || 'MES_ANIO');
  };

  // Eliminar formato guardado
  const handleDeleteTemplate = (id: string, name: string) => {
    Swal.fire({
      title: `¿Eliminar formato "${name}"?`,
      text: 'Se quitará de tu lista de CITES guardados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        const filtered = savedTemplates.filter(t => t.id !== id);
        setSavedTemplates(filtered);
        localStorage.setItem('ende_saved_cites_templates_v2', JSON.stringify(filtered));
        if (builderEditingTemplateId === id) {
          setBuilderEditingTemplateId(null);
        }
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1400, showConfirmButton: false });
      }
    });
  };

  // Copiar código CITE al portapapeles
  const handleCopyCiteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    Swal.fire({
      icon: 'success',
      title: '¡Copiado!',
      text: `Código ${code} copiado al portapapeles.`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Abrir Registro Directo
  const handleOpenNew = async () => {
    setEditingId(null);
    const nextNum = await getNextCiteCorrelative();
    setCorrelativeNumber(nextNum);
    const todayStr = new Date().toISOString().split('T')[0];
    setIssueDate(todayStr);
    
    // Sugerir uno estándar
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

  // Variables desglosadas por colores
  const builderMonthStr = String(builderMonth).padStart(2, '0');
  const builderYearFullStr = String(builderYear);
  const builderYearShortStr = builderYearFullStr.slice(-2);
  const builderNumStr = String(builderCorrelative || 1).padStart(builderDigits, '0');
  const builderCleanSigla = (builderSigla || 'SIGLA').trim().toUpperCase();

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
                title="Construir, almacenar y editar formatos de CITES"
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

      {/* VISTA 2: CONSTRUCTOR DE CITES (Almacenar, Editar y Ver CITES creados) */}
      {viewMode === 'builder' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-indigo-200 shadow-xl space-y-6 max-w-5xl mx-auto">
          
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl shadow-inner">
                <Palette className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase flex items-center gap-2">
                  Constructor de CITES Personalizados
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  {builderEditingTemplateId ? 'Editando formato existente' : 'Crea, almacena y administra tus formatos de CITE'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-4 py-2 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cerrar</span>
            </button>
          </div>

          {/* CAJA PRINCIPAL DE VISTA PREVIA DESGLOSADA POR COLORES */}
          <div className="bg-slate-950 border-2 border-indigo-500/40 text-white p-6 sm:p-8 rounded-3xl text-center space-y-4 shadow-2xl">
            <span className="text-[11px] font-mono font-black text-indigo-300 uppercase tracking-widest block">
              🎨 Vista Previa Desglosada por Colores:
            </span>

            {/* CÓDIGO CON BLOQUES DE COLORES */}
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 p-3 sm:p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl font-mono font-black text-xl sm:text-3xl tracking-wide shadow-inner">
              
              {/* SIGLA (Púrpura / Índigo) */}
              <span className="bg-indigo-600/40 text-indigo-300 border-2 border-indigo-400 px-3.5 py-1 rounded-xl shadow" title="1. Sigla">
                {builderCleanSigla}
              </span>

              <span className="text-slate-500 font-bold">-</span>

              {/* CORRELATIVO (Verde Esmeralda) */}
              <span className="bg-emerald-600/40 text-emerald-300 border-2 border-emerald-400 px-3.5 py-1 rounded-xl shadow" title="2. Correlativo">
                {builderNumStr}
              </span>

              <span className="text-slate-500 font-bold">/</span>

              {/* MES (Azul Cielo) */}
              {builderFormatStyle === 'MES_ANIO' && (
                <>
                  <span className="bg-sky-600/40 text-sky-300 border-2 border-sky-400 px-3.5 py-1 rounded-xl shadow" title="3. Mes">
                    {builderMonthStr}
                  </span>
                  <span className="text-slate-500 font-bold">/</span>
                </>
              )}

              {/* AÑO (Ámbar / Dorado) */}
              <span className="bg-amber-600/40 text-amber-300 border-2 border-amber-400 px-3.5 py-1 rounded-xl shadow" title="4. Año">
                {builderFormatStyle === 'MES_ANIO' ? builderYearShortStr : builderYearFullStr}
              </span>

            </div>

            {/* GUÍA DE COLORES / LEYENDA VISUAL */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-bold pt-1">
              
              <div className="flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-500 text-indigo-200 px-3 py-1 rounded-xl">
                <span className="w-3 h-3 rounded-full bg-indigo-400 inline-block shadow"></span>
                <span>1. Sigla: <strong className="text-white font-mono">{builderCleanSigla}</strong></span>
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500 text-emerald-200 px-3 py-1 rounded-xl">
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block shadow"></span>
                <span>2. Correlativo: <strong className="text-white font-mono">#{builderNumStr}</strong></span>
              </div>

              {builderFormatStyle === 'MES_ANIO' && (
                <div className="flex items-center gap-1.5 bg-sky-950/80 border border-sky-500 text-sky-200 px-3 py-1 rounded-xl">
                  <span className="w-3 h-3 rounded-full bg-sky-400 inline-block shadow"></span>
                  <span>3. Mes: <strong className="text-white font-mono">{builderMonthStr}</strong></span>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-500 text-amber-200 px-3 py-1 rounded-xl">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow"></span>
                <span>4. Año: <strong className="text-white font-mono">{builderFormatStyle === 'MES_ANIO' ? builderYearShortStr : builderYearFullStr}</strong></span>
              </div>

            </div>

          </div>

          {/* NOMBRE O ETIQUETA DEL FORMATO */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
            <label className="block text-xs font-black text-slate-800 uppercase">
              Nombre o Etiqueta para Almacenar este CITE:
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="EJ. CITE INSPECCIÓN Y BAJAS, NOTAS SEGURIDAD INDUSTRIAL..."
              className="w-full bg-white border-2 border-slate-300 text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* OPCIONES DE CONFIGURACIÓN SIMPLIFICADAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            
            {/* 1. TARJETA PÚRPURA: SIGLA (SOLO 3 SUGERENCIAS) */}
            <div className="bg-indigo-50/60 p-5 rounded-2xl border-2 border-indigo-300 space-y-2 shadow-sm">
              <label className="block text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block"></span>
                1. Sigla / Prefijo:
              </label>
              <input
                type="text"
                value={builderSigla}
                onChange={(e) => setBuilderSigla(e.target.value)}
                placeholder="EJ. EDO-IB, EDO-SI, CITE-SI..."
                className="w-full bg-white border-2 border-indigo-400 text-indigo-950 text-sm font-black font-mono uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-600"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-indigo-700 font-bold self-center">Sugerencias:</span>
                {quickSiglas.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBuilderSigla(s)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                      builderSigla === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-indigo-900 hover:bg-indigo-100 border-indigo-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. TARJETA VERDE ESMERALDA: CORRELATIVO */}
            <div className="bg-emerald-50/60 p-5 rounded-2xl border-2 border-emerald-300 space-y-2 shadow-sm">
              <label className="block text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                2. Número Correlativo y Dígitos:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={builderCorrelative}
                  onChange={(e) => setBuilderCorrelative(parseInt(e.target.value) || 1)}
                  placeholder="Ej. 1, 45..."
                  className="flex-1 bg-white border-2 border-emerald-400 text-emerald-950 text-sm font-black font-mono rounded-xl px-4 py-2.5"
                />
                <select
                  value={builderDigits}
                  onChange={(e) => setBuilderDigits(Number(e.target.value))}
                  className="bg-white border-2 border-emerald-400 rounded-xl px-3 py-2 text-xs font-black text-emerald-950"
                >
                  <option value={3}>3 dígitos (001)</option>
                  <option value={2}>2 dígitos (01)</option>
                  <option value={1}>1 dígito (1)</option>
                </select>
              </div>
              <p className="text-[10px] text-emerald-700 font-bold">
                Formato: <strong>#{builderNumStr}</strong>
              </p>
            </div>

            {/* 3. TARJETA AZUL CIELO: FECHA (SOLO MES Y AÑO) */}
            <div className="bg-sky-50/60 p-5 rounded-2xl border-2 border-sky-300 space-y-2 shadow-sm">
              <label className="block text-xs font-black text-sky-950 uppercase flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span>
                3. Fecha del CITE (Solo Mes y Año):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-sky-900 block mb-0.5">Mes:</label>
                  <select
                    value={builderMonth}
                    onChange={(e) => setBuilderMonth(Number(e.target.value))}
                    className="w-full bg-white border-2 border-sky-400 text-sky-950 text-xs font-black rounded-xl px-3 py-2.5"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-sky-900 block mb-0.5">Año:</label>
                  <select
                    value={builderYear}
                    onChange={(e) => setBuilderYear(Number(e.target.value))}
                    className="w-full bg-white border-2 border-sky-400 text-sky-950 text-xs font-black rounded-xl px-3 py-2.5"
                  >
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                    <option value={2028}>2028</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. TARJETA ÁMBAR: ESTILO DE SEPARADORES SIMPLIFICADO */}
            <div className="bg-amber-50/60 p-5 rounded-2xl border-2 border-amber-300 space-y-2 shadow-sm">
              <label className="block text-xs font-black text-amber-950 uppercase flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                4. Estilo de Separadores:
              </label>
              <select
                value={builderFormatStyle}
                onChange={(e) => setBuilderFormatStyle(e.target.value as any)}
                className="w-full bg-white border-2 border-amber-400 text-amber-950 text-sm font-black rounded-xl px-4 py-2.5"
              >
                <option value="MES_ANIO">Mes / Año</option>
                <option value="SOLO_ANIO">Solamente Año</option>
              </select>
              <p className="text-[10px] text-amber-800 font-bold">
                {builderFormatStyle === 'MES_ANIO' ? 'Incluye mes y año corto' : 'Incluye solo año completo'}
              </p>
            </div>

          </div>

          {/* BOTÓN DE ALMACENAR / GUARDAR ESTE FORMATO */}
          <div className="pt-2 flex flex-col sm:flex-row justify-end items-center gap-3">
            {builderEditingTemplateId && (
              <button
                type="button"
                onClick={() => {
                  setBuilderEditingTemplateId(null);
                  setTemplateName('NUEVO FORMATO CITE');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold underline"
              >
                Cancelar edición
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveTemplate}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm px-8 py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>{builderEditingTemplateId ? 'Actualizar Formato de CITE' : 'Almacenar Formato de CITE'}</span>
            </button>
          </div>

          {/* SECCIÓN: VER Y EDITAR LOS FORMATOS CREADOS / ALMACENADOS */}
          <div className="pt-6 border-t-2 border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-indigo-600" />
                Mis Formatos de CITE Almacenados ({savedTemplates.length})
              </h3>
              <span className="text-xs text-slate-500 font-bold">Puedes editarlos o copiar su código en cualquier momento</span>
            </div>

            {savedTemplates.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-2xl">
                No tienes formatos almacenados. ¡Configura uno arriba y presiona &quot;Almacenar Formato de CITE&quot;!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedTemplates.map((tmpl) => (
                  <div 
                    key={tmpl.id} 
                    className={`p-4 rounded-2xl border-2 transition space-y-3 shadow-sm ${
                      builderEditingTemplateId === tmpl.id ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300' : 'bg-slate-50 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase">{tmpl.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold">Sigla: {tmpl.sigla} | Formato: {tmpl.formatStyle === 'MES_ANIO' ? 'Mes / Año' : 'Solamente Año'}</p>
                      </div>
                      <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {tmpl.updatedAt}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-900 text-amber-300 font-mono font-black text-sm rounded-xl text-center border border-slate-800">
                      {tmpl.previewCode}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCopyCiteCode(tmpl.previewCode)}
                        className="text-slate-600 hover:text-blue-700 font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditTemplate(tmpl)}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-black px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 transition"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* VISTA 3: FORMULARIO DE REGISTRO */}
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

          {/* SELECTOR DE CITES CONSTRUIDOS / ALMACENADOS */}
          {savedTemplates.length > 0 && (
            <div className="bg-indigo-50/70 border-2 border-indigo-200 p-4 sm:p-5 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                  Seleccionar de mis CITES construidos:
                </span>
                <button
                  type="button"
                  onClick={handleOpenBuilder}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>+ Construir / Administrar CITES</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {savedTemplates.map((tmpl) => {
                  // Calcular dinámicamente el código del template con la fecha y correlativo actuales
                  const dateObj = issueDate ? new Date(issueDate + 'T00:00:00') : new Date();
                  const mStr = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const yShort = String(dateObj.getFullYear()).slice(-2);
                  const yFull = String(dateObj.getFullYear());
                  const cNum = String(correlativeNumber || tmpl.correlative || 1).padStart(tmpl.digits || 3, '0');
                  const calculatedCode = tmpl.formatStyle === 'MES_ANIO'
                    ? `${tmpl.sigla}-${cNum}/${mStr}/${yShort}`
                    : `${tmpl.sigla}-${cNum}/${yFull}`;

                  const isSelected = docNumber === calculatedCode || docNumber === tmpl.previewCode;

                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => {
                        setDocNumber(calculatedCode);
                        if (tmpl.correlative && (!correlativeNumber || correlativeNumber === 1)) {
                          setCorrelativeNumber(tmpl.correlative);
                        }
                      }}
                      className={`text-left p-2.5 rounded-xl border-2 transition flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300' 
                          : 'bg-white hover:bg-indigo-100/50 text-slate-800 border-indigo-200'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-[10px] font-black uppercase truncate ${isSelected ? 'text-indigo-100' : 'text-indigo-800'}`}>
                          {tmpl.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] bg-white text-indigo-700 px-1.5 py-0.2 rounded-full font-bold">
                            ✓ Activo
                          </span>
                        )}
                      </div>
                      <p className={`font-mono font-black text-xs sm:text-sm mt-1 truncate ${isSelected ? 'text-amber-300' : 'text-slate-900'}`}>
                        {calculatedCode}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  <Palette className="w-3 h-3" />
                  <span>Personalizar en Constructor</span>
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
