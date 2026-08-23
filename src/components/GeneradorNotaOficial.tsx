'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Sparkles, Printer, Save, RefreshCw, Plus, Trash2, 
  ArrowLeft, Check, Copy, Layers, Wrench, Shield, Footprints, Shirt, Edit3
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  OfficialNoteInput, 
  OfficialNoteData 
} from '@/lib/officialNoteTypes';
import { 
  saveOfficialNote, 
  getOfficialNotes, 
  deleteOfficialNote, 
  generateAIOfficialNote 
} from '@/app/actions/officialNote';

interface GeneradorNotaOficialProps {
  onBackToMainApp?: () => void;
  showTabs?: boolean;
}

export default function GeneradorNotaOficial({ onBackToMainApp, showTabs = true }: GeneradorNotaOficialProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

  // Estados del Documento Oficial
  const currentYear = new Date().getFullYear();
  const [noteNumber, setNoteNumber] = useState(`047/${currentYear}`);
  const [issueDate, setIssueDate] = useState('Oruro, 26 de mayo de 2026');
  const [recipientName, setRecipientName] = useState('Lic. Vicente Paul Vega Ramirez');
  const [recipientRole, setRecipientRole] = useState('RESPONSABLE DE CONTRATACIONES');
  const [viaName, setViaName] = useState('Lic. Raúl Alberto Torrico Gomez');
  const [viaRole, setViaRole] = useState('GERENTE GENERAL');
  const [senderName, setSenderName] = useState('Ing. Heydi Dunya Canaviri Padilla');
  const [senderRole, setSenderRole] = useState('SUPERVISOR DE SEGURIDAD INDUSTRIAL');
  const [objectTitle, setObjectTitle] = useState('SOLICITUD DE INICIO DEL PROCESO DE COMPRA "ADQUISICIÓN DE HERRAMIENTA PARA CUADRILLAS"');
  
  const [introParagraph, setIntroParagraph] = useState('Por medio de la presente, me dirijo a su autoridad para solicitar formalmente el inicio del proceso de compra correspondiente al proceso "ADQUISICIÓN DE HERRAMIENTA PARA CUADRILLAS".');
  const [legalParagraph, setLegalParagraph] = useState('Esta solicitud, se realiza en cumplimiento al Reglamento y Manual de Procedimiento de Adquisiciones de Bienes, construcciones de Obras y Contrataciones de Servicio, adjunto a la presente los documentos de respaldo necesarios para el inicio del proceso de contratación:');
  
  const [attachedDocuments, setAttachedDocuments] = useState<string[]>([
    'Formulario S1-N014 de solicitud de Adquisiciones de Bienes, Construcción de Obras o Contratación de Servicios.',
    'Cuadro de Justificación de solicitud de compra.',
    'Especificaciones Técnicas o Termino de Referencia.',
    'Cotizaciones o precio referencial.'
  ]);

  const [closingParagraph, setClosingParagraph] = useState('Sin otra particularidad y con las consideraciones del caso, me despido.');
  const [includeFooterCopy, setIncludeFooterCopy] = useState(true);

  // Estados de IA
  const [customAIPrompt, setCustomAIPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Historial
  const [notesHistory, setNotesHistory] = useState<OfficialNoteData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const data = await getOfficialNotes();
    setNotesHistory(data);
    setLoadingHistory(false);
  };

  // Generación Inteligente Asistida por IA
  const handleGenerateAI = async (category: string, promptText?: string) => {
    setIsGeneratingAI(true);
    try {
      const res = await generateAIOfficialNote(category, promptText || customAIPrompt);
      if (res.success && res.note) {
        const n = res.note;
        setNoteNumber(n.noteNumber);
        setIssueDate(n.issueDate);
        setRecipientName(n.recipientName);
        setRecipientRole(n.recipientRole);
        setViaName(n.viaName);
        setViaRole(n.viaRole);
        setSenderName(n.senderName);
        setSenderRole(n.senderRole);
        setObjectTitle(n.objectTitle);
        setIntroParagraph(n.introParagraph);
        setLegalParagraph(n.legalParagraph);
        setAttachedDocuments(n.attachedDocuments);
        setClosingParagraph(n.closingParagraph);
        setIncludeFooterCopy(n.includeFooterCopy);

        Swal.fire({
          icon: 'success',
          title: '¡Nota Oficial Generada con IA!',
          text: 'Se ha redactado la nota respetando el formato institucional de ENDE DEORURO.',
          timer: 1800,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'No se pudo generar el documento.',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'Error al conectar con el asistente de IA.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Manejo de Documentos Adjuntos
  const handleAddAttachment = () => {
    setAttachedDocuments(prev => [...prev, 'Nuevo documento o respaldo técnico...']);
  };

  const handleUpdateAttachment = (index: number, value: string) => {
    setAttachedDocuments(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Guardar en Base de Datos
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const noteInput: OfficialNoteInput = {
        noteNumber,
        issueDate,
        recipientName,
        recipientRole,
        viaName,
        viaRole,
        senderName,
        senderRole,
        objectTitle,
        introParagraph,
        legalParagraph,
        attachedDocuments,
        closingParagraph,
        includeFooterCopy
      };

      const res = await saveOfficialNote(noteInput);
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Nota Oficial Guardada!',
          text: `Nota N° ${res.noteNumber} registrada exitosamente en el sistema.`,
          confirmButtonColor: '#2563eb'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al Guardar',
          text: res.error || 'No se pudo guardar la nota.',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e?.message || 'Error al procesar la operación.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLoadNote = (note: OfficialNoteData) => {
    setNoteNumber(note.noteNumber);
    setIssueDate(note.issueDate);
    setRecipientName(note.recipientName);
    setRecipientRole(note.recipientRole);
    setViaName(note.viaName);
    setViaRole(note.viaRole);
    setSenderName(note.senderName);
    setSenderRole(note.senderRole);
    setObjectTitle(note.objectTitle);
    setIntroParagraph(note.introParagraph);
    setLegalParagraph(note.legalParagraph);
    setAttachedDocuments(note.attachedDocuments || []);
    setClosingParagraph(note.closingParagraph);
    setIncludeFooterCopy(note.includeFooterCopy);
    setActiveTab('editor');

    Swal.fire({
      icon: 'info',
      title: 'Nota Cargada en el Editor',
      text: `Nota N° ${note.noteNumber} lista para editar o imprimir.`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleDeleteNote = async (id: string) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar Nota Oficial?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteOfficialNote(id);
      if (res.success) {
        fetchHistory();
        Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          timer: 1200,
          showConfirmButton: false
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased">
      
      {/* HEADER DE LA APLICACIÓN (OCULTO EN IMPRESIÓN) */}
      <header className="bg-slate-900 text-white border-b-4 border-blue-600 shadow-md sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onBackToMainApp && (
              <button 
                onClick={onBackToMainApp}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition border border-slate-700 flex items-center justify-center shrink-0"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <img 
                src="/logo-ende.png" 
                alt="ENDE DEORURO" 
                className="h-10 sm:h-11 w-auto object-contain"
              />
              <div>
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                  ENDE DEORURO
                </h1>
                <p className="text-xs text-blue-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  Carpeta 5: Generador de Nota Oficial de Compra
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Pestañas */}
          {showTabs && (
            <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'editor' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editor e IA
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                <Layers className="w-3.5 h-3.5" />
                Historial de Notas
              </button>
            </div>
          )}

        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        
        {activeTab === 'editor' ? (
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* PANEL LATERAL DE GENERACIÓN CON IA Y EDICIÓN (OCULTO AL IMPRIMIR) */}
            <div className="lg:col-span-5 space-y-5 print:hidden">
              
              {/* ASISTENTE DE GENERACIÓN CON IA */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border-2 border-indigo-500/40 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600/50 rounded-xl border border-indigo-400/30">
                    <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                      Generador Inteligente con IA
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">
                      Seleccione una plantilla o describa su requerimiento
                    </p>
                  </div>
                </div>

                {/* Botones de Acceso Rápido por Categoría */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateAI('HERRAMIENTAS')}
                    disabled={isGeneratingAI}
                    className="flex items-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition border border-slate-700 text-left disabled:opacity-50"
                  >
                    <Wrench className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Herramientas Cuadrillas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateAI('BOTINES')}
                    disabled={isGeneratingAI}
                    className="flex items-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition border border-slate-700 text-left disabled:opacity-50"
                  >
                    <Footprints className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Botines de Seguridad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateAI('EPP')}
                    disabled={isGeneratingAI}
                    className="flex items-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition border border-slate-700 text-left disabled:opacity-50"
                  >
                    <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Equipos de EPP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateAI('ROPA')}
                    disabled={isGeneratingAI}
                    className="flex items-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition border border-slate-700 text-left disabled:opacity-50"
                  >
                    <Shirt className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Ropa Térmica / Trabajo</span>
                  </button>
                </div>

                {/* Prompt Personalizado para IA */}
                <div className="space-y-2 pt-1">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase">
                    O escriba el Objeto / Detalle del Proceso de Compra:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej. Adquisición de guantes dieléctricos clase 2..."
                      value={customAIPrompt}
                      onChange={(e) => setCustomAIPrompt(e.target.value)}
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleGenerateAI('CUSTOM', customAIPrompt)}
                      disabled={isGeneratingAI || !customAIPrompt.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {isGeneratingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                      <span>Generar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* FORMULARIO DE EDICIÓN EN VIVO */}
              <div className="bg-white p-5 rounded-3xl border-2 border-slate-300 shadow-md space-y-4 text-xs font-bold text-slate-800">
                <div className="border-b pb-3 flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    Campos Editables del Documento
                  </h3>
                  <span className="text-[10px] text-slate-500 font-normal">Edición en tiempo real</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-600 uppercase">N° de Nota:</label>
                    <input
                      type="text"
                      value={noteNumber}
                      onChange={(e) => setNoteNumber(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-600 uppercase">Lugar y Fecha:</label>
                    <input
                      type="text"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 uppercase">A (Destinatario):</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-bold"
                  />
                  <input
                    type="text"
                    value={recipientRole}
                    onChange={(e) => setRecipientRole(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1 text-[11px] text-slate-600 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 uppercase">VIA (Vía de Aprobación):</label>
                  <input
                    type="text"
                    value={viaName}
                    onChange={(e) => setViaName(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-bold"
                  />
                  <input
                    type="text"
                    value={viaRole}
                    onChange={(e) => setViaRole(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1 text-[11px] text-slate-600 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 uppercase">DE (Remitente):</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-bold"
                  />
                  <input
                    type="text"
                    value={senderRole}
                    onChange={(e) => setSenderRole(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1 text-[11px] text-slate-600 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 uppercase">OBJETO (Proceso de Compra):</label>
                  <textarea
                    rows={2}
                    value={objectTitle}
                    onChange={(e) => setObjectTitle(e.target.value)}
                    className="w-full bg-slate-50 border rounded-lg px-2.5 py-1.5 font-black uppercase text-xs"
                  />
                </div>

                {/* Lista de Adjuntos Editables */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] text-slate-600 uppercase font-black">
                      Documentos de Respaldo Adjuntos:
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-black flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> + Agregar Adjunto
                    </button>
                  </div>

                  {attachedDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={doc}
                        onChange={(e) => handleUpdateAttachment(idx, e.target.value)}
                        className="flex-1 bg-slate-50 border rounded-lg px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Eliminar ítem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="pt-3 border-t grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-3 rounded-xl transition flex items-center justify-center gap-2 shadow"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Guardar Nota</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Imprimir Nota</span>
                  </button>
                </div>

              </div>

            </div>

            {/* VISTA PREVIA IMPRIMIBLE 1:1 CON EL DOCUMENTO REAL (CLASE print-area) */}
            <div className="lg:col-span-7">
              
              {/* Botón flotante para imprimir rápido */}
              <div className="flex justify-between items-center mb-3 bg-white p-3.5 rounded-2xl border shadow-sm print:hidden">
                <span className="text-xs font-black text-slate-700 uppercase flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Previsualización Oficial (Formato Carta)
                </span>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-xl transition flex items-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Imprimir en Hoja Carta</span>
                </button>
              </div>

              {/* HOJA OFICIAL CON CLASE print-area */}
              <div className="print-area bg-white text-black p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-xl max-w-[800px] mx-auto print:shadow-none print:border-none print:w-full print:p-0 font-sans min-h-[950px] flex flex-col justify-between">
                
                <div className="space-y-6">
                  
                  {/* ENCABEZADO INSTITUCIONAL CON LOGO */}
                  <div className="flex flex-col items-start space-y-1 mb-6">
                    <img 
                      src="/logo-ende.png" 
                      alt="ENDE DEORURO" 
                      className="h-11 sm:h-12 w-auto object-contain"
                    />
                    <p className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-tight pl-1">
                      DISTRIBUIDORA DE ELECTRICIDAD ENDE DEORURO S.A.
                    </p>
                  </div>

                  {/* TABLA DE METADATOS: No., Fecha, A, VIA, DE, OBJETO */}
                  <div className="space-y-3.5 text-xs sm:text-sm font-sans">
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 w-16 uppercase">No.</span>
                        <span className="font-bold font-mono">{noteNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{issueDate}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                      <span className="font-black text-slate-900 w-16 shrink-0 uppercase">A :</span>
                      <div>
                        <p className="font-bold text-slate-900 uppercase">{recipientName}</p>
                        <p className="font-black text-slate-900 text-xs uppercase tracking-wide">{recipientRole}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="font-black text-slate-900 w-16 shrink-0 uppercase">VIA :</span>
                      <div>
                        <p className="font-bold text-slate-900 uppercase">{viaName}</p>
                        <p className="font-black text-slate-900 text-xs uppercase tracking-wide">{viaRole}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="font-black text-slate-900 w-16 shrink-0 uppercase">DE :</span>
                      <div>
                        <p className="font-bold text-slate-900 uppercase">{senderName}</p>
                        <p className="font-black text-slate-900 text-xs uppercase tracking-wide">{senderRole}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-1">
                      <span className="font-black text-slate-900 w-16 shrink-0 uppercase">OBJETO:</span>
                      <div className="flex-1 font-black text-slate-900 uppercase tracking-wide leading-snug">
                        {objectTitle}
                      </div>
                    </div>

                  </div>

                  {/* LÍNEA DIVISORIA GRUESA OFICIAL */}
                  <hr className="border-t-2 border-slate-900 my-4" />

                  {/* CUERPO DEL DOCUMENTO */}
                  <div className="space-y-4 text-xs sm:text-sm text-slate-900 leading-relaxed text-justify">
                    
                    <p className="font-bold">De mi mayor consideración:</p>

                    <p>{introParagraph}</p>

                    <p>{legalParagraph}</p>

                    {/* LISTADO CON VIÑETAS DE DOCUMENTOS ADJUNTOS */}
                    <ul className="list-disc pl-8 space-y-1.5 font-medium">
                      {attachedDocuments.map((doc, i) => (
                        <li key={i}>{doc}</li>
                      ))}
                    </ul>

                    <p>{closingParagraph}</p>

                    <p className="pt-2 font-bold">Atentamente,</p>

                  </div>

                </div>

                {/* BLOQUE DE FIRMA Y PIE DE PÁGINA */}
                <div className="pt-20 space-y-8">
                  
                  {/* FIRMA REMITENTE */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-64 border-t border-slate-400 mb-2"></div>
                    <p className="font-bold text-xs sm:text-sm uppercase text-slate-900">{senderName}</p>
                    <p className="font-black text-[11px] sm:text-xs uppercase text-slate-900 tracking-wide">{senderRole}</p>
                    <p className="font-bold text-[10px] sm:text-[11px] uppercase text-slate-700">DISTRIBUIDORA DE ELECTRICIDAD ENDE DEORURO S.A.</p>
                  </div>

                  {/* REFERENCIAS INFERIORES */}
                  {includeFooterCopy && (
                    <div className="text-[11px] font-sans font-bold text-slate-600 space-y-0.5 pt-4">
                      <p>Cc. Arch.</p>
                      <p>Adj. Lo indicado</p>
                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>

        ) : (

          /* PESTAÑA HISTORIAL DE NOTAS OFICIALES */
          <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-700" />
                  Historial de Notas Oficiales Emitidas (Carpeta 5)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Seleccione una nota guardada para editarla o reimprimirla
                </p>
              </div>

              <button
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition"
                title="Actualizar lista"
              >
                <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-12 text-xs text-slate-500 font-bold">Cargando notas...</div>
            ) : notesHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs sm:text-sm font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                No hay notas oficiales guardadas en el historial.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-300">
                <table className="w-full border-collapse text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase">
                      <th className="p-3 text-center">N° Nota</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Objeto de Compra</th>
                      <th className="p-3">Destinatario</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {notesHistory.map((note) => (
                      <tr key={note.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-black font-mono text-blue-700">
                          {note.noteNumber}
                        </td>
                        <td className="p-3 text-slate-600 font-medium whitespace-nowrap">
                          {note.issueDate}
                        </td>
                        <td className="p-3 font-black text-slate-900 uppercase">
                          {note.objectTitle}
                        </td>
                        <td className="p-3 text-slate-700 uppercase text-xs">
                          {note.recipientName}
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleLoadNote(note)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition font-black"
                          >
                            Cargar / Imprimir
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500 font-bold print:hidden mt-auto">
        <p>ENDE DEORURO - Sistema de Generación de Notas Oficiales y Carpetas de Compra © {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
}
