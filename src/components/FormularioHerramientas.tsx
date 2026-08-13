'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Trash2, Copy, Save, Printer, RefreshCw, 
  CheckCircle2, Clock, AlertCircle, Building2, User, FileText, 
  Layers, ArrowLeft, Database, Download, Check, HelpCircle, Shield, X, Filter
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  createToolRequest, 
  getToolRequests, 
  getToolRequestDetails, 
  updateToolRequestStatus, 
  deleteToolRequest
} from '@/app/actions/toolRequest';
import { 
  TECHNICAL_AREAS,
  TOOL_TYPES_PRESETS,
  ToolRequestData,
  ToolRequestItemData
} from '@/lib/toolRequestTypes';

interface FormRowItem {
  id: string;
  itemNumber: number;
  toolType: string;
  description: string;
  quantity: number;
  area: string;
}

interface FormularioHerramientasProps {
  onBackToMainApp?: () => void;
}

export default function FormularioHerramientas({ onBackToMainApp }: FormularioHerramientasProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // Estados del Formulario
  const [supervisorName, setSupervisorName] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>(TECHNICAL_AREAS[0]);
  const [customArea, setCustomArea] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [justification, setJustification] = useState('');
  
  // Filas de Herramientas
  const [rows, setRows] = useState<FormRowItem[]>([
    { id: '1', itemNumber: 1, toolType: 'Herramienta Manual', description: '', quantity: 1, area: TECHNICAL_AREAS[0] },
    { id: '2', itemNumber: 2, toolType: 'Herramienta Eléctrica', description: '', quantity: 1, area: TECHNICAL_AREAS[0] },
    { id: '3', itemNumber: 3, toolType: 'Instrumento de Medición y Prueba', description: '', quantity: 1, area: TECHNICAL_AREAS[0] }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para Visualizar / Imprimir Solicitud
  const [viewingRequest, setViewingRequest] = useState<ToolRequestData | null>(null);
  const [viewingItems, setViewingItems] = useState<ToolRequestItemData[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Historial
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [areaFilter, setAreaFilter] = useState('TODAS');

  // Modal SQL Supabase
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Actualizar área de filas al cambiar el área principal si el usuario no ha especificado otra
  useEffect(() => {
    const currentArea = selectedArea === 'OTRA' ? (customArea || 'ÁREA TÉCNICA') : selectedArea;
    setRows(prevRows => prevRows.map(row => ({
      ...row,
      area: row.area ? row.area : currentArea
    })));
  }, [selectedArea, customArea]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, areaFilter]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const data = await getToolRequests(areaFilter);
    setHistoryList(data);
    setLoadingHistory(false);
  };

  const getEffectiveArea = () => {
    return selectedArea === 'OTRA' ? (customArea.trim() || 'ÁREA TÉCNICA') : selectedArea;
  };

  const handleAddRow = () => {
    const newId = Date.now().toString();
    const effectiveArea = getEffectiveArea();
    setRows(prev => [
      ...prev,
      {
        id: newId,
        itemNumber: prev.length + 1,
        toolType: 'Herramienta Manual',
        description: '',
        quantity: 1,
        area: effectiveArea
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) {
      Swal.fire({
        icon: 'info',
        title: 'Mínimo de filas',
        text: 'La solicitud debe tener al menos una herramienta.',
        confirmButtonColor: '#0284c7'
      });
      return;
    }
    const updated = rows.filter((_, i) => i !== index).map((row, idx) => ({
      ...row,
      itemNumber: idx + 1
    }));
    setRows(updated);
  };

  const handleDuplicateRow = (index: number) => {
    const target = rows[index];
    const newId = Date.now().toString();
    const newRow: FormRowItem = {
      ...target,
      id: newId,
      itemNumber: rows.length + 1
    };
    setRows(prev => [...prev, newRow]);
  };

  const handleRowChange = (index: number, field: keyof FormRowItem, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleLoadSampleTemplate = () => {
    const effectiveArea = getEffectiveArea();
    setRows([
      { id: '1', itemNumber: 1, toolType: 'Herramienta Manual', description: 'Juego de llaves combinadas (8 a 24 mm) cromo vanadio', quantity: 2, area: effectiveArea },
      { id: '2', itemNumber: 2, toolType: 'Herramienta Manual', description: 'Alicate universal dieléctrico 1000V de 8 pulgadas', quantity: 4, area: effectiveArea },
      { id: '3', itemNumber: 3, toolType: 'Herramienta Eléctrica', description: 'Amoladora angular 4 1/2" 850W industrial con disco de corte', quantity: 1, area: effectiveArea },
      { id: '4', itemNumber: 4, toolType: 'Instrumento de Medición y Prueba', description: 'Multímetro digital de gancho True RMS CAT IV 600V', quantity: 2, area: effectiveArea },
      { id: '5', itemNumber: 5, toolType: 'Equipo de Maniobra / Altura', description: 'Cinturón de seguridad con estrobo dieléctrico reforzado', quantity: 3, area: effectiveArea }
    ]);
  };

  const handleClearRows = () => {
    const effectiveArea = getEffectiveArea();
    setRows([
      { id: '1', itemNumber: 1, toolType: 'Herramienta Manual', description: '', quantity: 1, area: effectiveArea }
    ]);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveArea = getEffectiveArea();

    if (!supervisorName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo Requerido',
        text: 'Por favor ingrese el Nombre del Supervisor / Solicitante de Área.',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const invalidItems = rows.filter(r => !r.description || !r.description.trim());
    if (invalidItems.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Items Incompletos',
        text: 'Por favor complete la DESCRIPCIÓN de todas las herramientas en la tabla.',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        supervisorName: supervisorName.trim(),
        area: effectiveArea,
        justification: justification.trim(),
        priority,
        items: rows.map((r, index) => ({
          itemNumber: index + 1,
          toolType: r.toolType,
          description: r.description.trim(),
          quantity: Number(r.quantity) || 1,
          area: r.area || effectiveArea
        }))
      };

      const result = await createToolRequest(payload);

      if (result.success && result.requestId) {
        Swal.fire({
          icon: 'success',
          title: '¡Solicitud Registrada con Éxito!',
          html: `
            <div class="text-left text-sm space-y-2">
              <p>Se ha registrado el pedido consolidado de herramientas de compra masiva.</p>
              <div class="bg-slate-100 p-2.5 rounded font-mono text-xs border border-slate-200">
                <p><strong>N° Folio:</strong> #${result.folio}</p>
                <p><strong>Código:</strong> ${result.requestCode}</p>
                <p><strong>Área:</strong> ${effectiveArea}</p>
                <p><strong>Total Items:</strong> ${rows.length} tipo(s) de herramientas</p>
              </div>
            </div>
          `,
          confirmButtonColor: '#0284c7',
          confirmButtonText: 'Ver Formulario para Imprimir / Exportar'
        }).then(() => {
          handleViewDetails(result.requestId);
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al Guardar',
          text: result.error || 'No se pudo guardar la solicitud en la base de datos.',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error Inesperado',
        text: err?.message || 'Ocurrió un error al procesar el envío.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = async (requestId: string) => {
    setLoadingDetails(true);
    const res = await getToolRequestDetails(requestId);
    if (res.success && res.request) {
      setViewingRequest(res.request);
      setViewingItems(res.items || []);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: res.error || 'No se pudo cargar la información de la solicitud.',
        confirmButtonColor: '#0284c7'
      });
    }
    setLoadingDetails(false);
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    const res = await updateToolRequestStatus(requestId, newStatus);
    if (res.success) {
      if (viewingRequest && viewingRequest.id === requestId) {
        setViewingRequest(prev => prev ? { ...prev, status: newStatus } : null);
      }
      fetchHistory();
      Swal.fire({
        icon: 'success',
        title: 'Estado Actualizado',
        text: `El requerimiento ha cambiado a: ${newStatus}`,
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleDeleteRequest = (requestId: string) => {
    Swal.fire({
      title: '¿Eliminar Solicitud?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteToolRequest(requestId);
        if (res.success) {
          if (viewingRequest?.id === requestId) {
            setViewingRequest(null);
          }
          fetchHistory();
          Swal.fire({
            icon: 'success',
            title: 'Eliminada',
            text: 'La solicitud fue removida del sistema.',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
    });
  };

  const sqlScriptText = `-- TABLAS SUPABASE PARA EL MÓDULO DE REQUERIMIENTO DE HERRAMIENTAS
CREATE SEQUENCE IF NOT EXISTS tool_request_folio_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS tool_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio INTEGER DEFAULT nextval('tool_request_folio_seq') UNIQUE,
    request_code TEXT NOT NULL UNIQUE,
    supervisor_name TEXT NOT NULL,
    area TEXT NOT NULL,
    justification TEXT,
    priority TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'Pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES tool_requests(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL,
    tool_type TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    area TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE tool_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_request_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo a todos en tool_requests" ON tool_requests;
CREATE POLICY "Permitir todo a todos en tool_requests" ON tool_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a todos en tool_request_items" ON tool_request_items;
CREATE POLICY "Permitir todo a todos en tool_request_items" ON tool_request_items FOR ALL USING (true) WITH CHECK (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlScriptText);
    Swal.fire({
      icon: 'success',
      title: '¡Copiado!',
      text: 'El script SQL de Supabase ha sido copiado al portapapeles.',
      timer: 1500,
      showConfirmButton: false
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
      
      {/* HEADER INSTITUCIONAL ENDE */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 print:hidden shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            {onBackToMainApp && (
              <button 
                onClick={onBackToMainApp}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700 flex items-center justify-center shrink-0"
                title="Volver al Sistema de Seguridad"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-xl border border-slate-700 shadow-sm shrink-0">
                <img 
                  src="/logo-ende.png" 
                  alt="ENDE ORURO" 
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-wider text-white uppercase flex items-center gap-2">
                  <span>ENDE CORPORACIÓN</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-600/30 text-blue-400 border border-blue-500/30">
                    ÁREA TÉCNICA
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Formulario Oficial de Requerimiento Masivo de Herramientas y Equipos
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setShowSqlModal(true)}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-2 rounded-xl transition"
              title="Ver / Copiar Script SQL de Supabase"
            >
              <Database className="w-4 h-4 text-amber-400" />
              <span>Script Supabase SQL</span>
            </button>

            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                onClick={() => { setViewingRequest(null); setActiveTab('create'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'create' && !viewingRequest ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Nueva Solicitud
              </button>

              <button
                onClick={() => { setViewingRequest(null); setActiveTab('history'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'history' && !viewingRequest ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                <FileText className="w-3.5 h-3.5" />
                Historial Requerimientos
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* MODAL SCRIPT SQL SUPABASE */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white uppercase">Script de Tablas Supabase</h3>
              </div>
              <button 
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Copia y pega este código en el <strong>SQL Editor</strong> de tu panel de Supabase para crear las tablas necesarias para guardar los requerimientos de herramientas.
            </p>

            <div className="relative flex-1 overflow-hidden bg-slate-950 rounded-xl border border-slate-800 p-3 font-mono text-[11px] text-emerald-400">
              <pre className="h-full overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                {sqlScriptText}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400">Pestaña Supabase -&gt; SQL Editor -&gt; Run</span>
              <div className="flex gap-2">
                <button
                  onClick={copySqlToClipboard}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Script SQL
                </button>
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-semibold text-slate-300">Cargando detalles de la solicitud de compra...</p>
          </div>
        ) : viewingRequest ? (
          
          /* VISTA COMPROBANTE OFICIAL PARA IMPRIMIR / REVISAR */
          <div className="space-y-4">
            
            {/* Action Bar (Solo Pantalla) */}
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden shadow-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingRequest(null)}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Panel
                </button>
                <div>
                  <h3 className="text-sm font-bold text-white">Solicitud N° Folio #{viewingRequest.folio}</h3>
                  <p className="text-xs text-slate-400">Código: {viewingRequest.requestCode} | Área: {viewingRequest.area}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Selector Estado */}
                <select
                  value={viewingRequest.status}
                  onChange={(e) => handleUpdateStatus(viewingRequest.id, e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Pendiente">Estado: Pendiente</option>
                  <option value="En Revisión">Estado: En Revisión</option>
                  <option value="Aprobado">Estado: Aprobado</option>
                  <option value="Rechazado">Estado: Rechazado</option>
                </select>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-lg transition"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Formulario
                </button>

                <button
                  onClick={() => handleDeleteRequest(viewingRequest.id)}
                  className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded-xl transition"
                  title="Eliminar Solicitud"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* DOCUMENTO IMPRESO EN FORMATO CARTA / INSTITUCIONAL */}
            <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-2xl max-w-4xl mx-auto print:shadow-none print:border-none print:w-full print:p-0 font-sans">
              
              {/* Header Imprimible */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  <img 
                    src="/logo-ende.png" 
                    alt="ENDE CORPORACION" 
                    className="h-12 w-auto object-contain"
                  />
                  <div>
                    <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">ENDE ORURO - DEPARTAMENTO TÉCNICO</h2>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">FORMULARIO DE REQUERIMIENTO MASIVO DE HERRAMIENTAS</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1 rounded">
                    N° FOLIO: #{viewingRequest.folio}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 font-mono">CÓDIGO: {viewingRequest.requestCode}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{new Date(viewingRequest.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Información General */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs mb-6">
                <div>
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Supervisor / Solicitante:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{viewingRequest.supervisorName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Área Técnica Solicicitante:</span>
                  <span className="font-extrabold text-blue-900 text-sm uppercase">{viewingRequest.area}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Prioridad de Compra:</span>
                  <span className="font-bold text-slate-800">{viewingRequest.priority}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Estado Actual:</span>
                  <span className="font-bold text-slate-800 uppercase">{viewingRequest.status}</span>
                </div>
                {viewingRequest.justification && (
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-500 block uppercase text-[10px]">Justificación / Finalidad de Adquisición:</span>
                    <p className="text-slate-800 italic mt-0.5">{viewingRequest.justification}</p>
                  </div>
                )}
              </div>

              {/* Tabla de Ítems Solicitados */}
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 mb-2 border-l-4 border-slate-900 pl-2">
                DETALLE DE HERRAMIENTAS Y EQUIPOS REQUERIDOS (NRO, TIPO, DESCRIPCIÓN, CANTIDAD, ÁREA)
              </h3>

              <table className="w-full border-collapse text-xs mb-8">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-left">
                    <th className="p-2.5 text-center w-12 border border-slate-900">NRO</th>
                    <th className="p-2.5 w-44 border border-slate-900">TIPO DE HERRAMIENTA</th>
                    <th className="p-2.5 border border-slate-900">DESCRIPCIÓN Y ESPECIFICACIONES</th>
                    <th className="p-2.5 text-center w-24 border border-slate-900">CANTIDAD</th>
                    <th className="p-2.5 w-44 border border-slate-900">ÁREA DESTINO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 border border-slate-300">
                  {viewingItems.map((item) => (
                    <tr key={item.id || item.itemNumber} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-bold font-mono border-r border-slate-300">{item.itemNumber}</td>
                      <td className="p-2.5 font-bold text-slate-800 border-r border-slate-300">{item.toolType}</td>
                      <td className="p-2.5 text-slate-900 border-r border-slate-300 font-medium">{item.description}</td>
                      <td className="p-2.5 text-center font-extrabold text-blue-900 border-r border-slate-300 text-sm font-mono">{item.quantity}</td>
                      <td className="p-2.5 text-slate-700 uppercase text-[11px] font-semibold">{item.area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Sección de Firmas */}
              <div className="grid grid-cols-2 gap-12 pt-16 mt-8 border-t border-slate-200 text-center text-xs">
                <div>
                  <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                  <p className="font-extrabold text-slate-900 uppercase">{viewingRequest.supervisorName}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">SUPERVISOR DE {viewingRequest.area}</p>
                  <p className="text-[10px] text-slate-400 font-medium">SOLICITANTE DE COMPRA</p>
                </div>

                <div>
                  <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                  <p className="font-extrabold text-slate-900 uppercase">JEFATURA DE ADQUISICIONES / ALMACÉN</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">ENDE ORURO</p>
                  <p className="text-[10px] text-slate-400 font-medium">APROBACIÓN Y CONSOLIDACIÓN</p>
                </div>
              </div>

              {/* Pie de Página */}
              <div className="mt-8 text-center text-[9px] text-slate-400 border-t pt-3 font-mono">
                Documento Oficial Generado para Consolidación de Compras por Mayor - ENDE ORURO
              </div>

            </div>

          </div>

        ) : activeTab === 'create' ? (

          /* FORMULARIO DE CREACIÓN DE REQUERIMIENTO */
          <div className="space-y-6 max-w-5xl mx-auto">
            
            {/* Banner de Presentación */}
            <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 p-6 rounded-3xl border border-blue-500/20 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-black text-white tracking-tight">Formulario de Requerimiento de Herramientas</h2>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl font-medium">
                  Diseñado para que los Supervisores de Área recopilen el requerimiento consolidado de sus técnicos para compras masivas.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleTemplate}
                  className="bg-slate-800/80 hover:bg-slate-800 text-blue-300 hover:text-white border border-blue-500/30 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  title="Cargar ejemplo de herramientas frecuentes"
                >
                  <Layers className="w-4 h-4 text-blue-400" />
                  Plantilla de Ejemplo
                </button>
              </div>
            </div>

            {/* FORMULARIO PRINCIPAL */}
            <form onSubmit={handleSubmitRequest} className="space-y-6">
              
              {/* Bloque 1: Datos de Cabecera y Selección de Área Técnica */}
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-lg space-y-6">
                
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                  <User className="w-4 h-4 text-blue-400" />
                  1. Información del Supervisor y Selección de Área Técnica
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Supervisor */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Nombre del Supervisor / Responsable Solicitante <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Ing. Carlos Sanchez (Supervisor de Área)"
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>

                  {/* Prioridad */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Prioridad del Requerimiento
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-3 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    >
                      <option value="Normal">Normal (Planificación Regular)</option>
                      <option value="Alta">Alta (Próxima Compra Masiva)</option>
                      <option value="Urgente">Urgente (Abastecimiento Inmediato)</option>
                    </select>
                  </div>

                </div>

                {/* Botones de Selección Rápida de las 5 Áreas Técnicas */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Seleccionar Área Técnica de ENDE <span className="text-red-400">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {TECHNICAL_AREAS.map((areaName) => (
                      <button
                        key={areaName}
                        type="button"
                        onClick={() => setSelectedArea(areaName)}
                        className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center justify-between gap-2 ${
                          selectedArea === areaName 
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-950' 
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{areaName}</span>
                        {selectedArea === areaName && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                        )}
                      </button>
                    ))}

                    {/* Opción Personalizada */}
                    <button
                      type="button"
                      onClick={() => setSelectedArea('OTRA')}
                      className={`p-3 rounded-2xl border text-left text-xs font-bold transition ${
                        selectedArea === 'OTRA' 
                          ? 'bg-blue-600/20 border-blue-500 text-white' 
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      + OTRA ÁREA TÉCNICA...
                    </button>
                  </div>

                  {selectedArea === 'OTRA' && (
                    <div className="pt-2">
                      <input
                        type="text"
                        placeholder="Especifique el nombre de la otra Área Técnica..."
                        value={customArea}
                        onChange={(e) => setCustomArea(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Justificación */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Justificación / Finalidad del Lote de Herramientas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Requerimiento para renovación de cajas de herramientas de las cuadrillas de campo del primer semestre..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  ></textarea>
                </div>

              </div>

              {/* Bloque 2: Tabla Dinámica de Herramientas (Nro, TIPO, DESCRIPCIÓN, CANTIDAD, ÁREA) */}
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-lg space-y-4">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-blue-400" />
                      2. Listado de Herramientas y Equipos Solicitados
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Campos obligatorios: Nro, TIPO, DESCRIPCIÓN, CANTIDAD y ÁREA.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearRows}
                      className="text-xs text-slate-400 hover:text-red-400 font-semibold px-2 py-1 transition"
                    >
                      Limpiar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Fila
                    </button>
                  </div>
                </div>

                {/* TABLA DE HERRAMIENTAS */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
                        <th className="p-3 text-center w-14">Nro</th>
                        <th className="p-3 w-48">TIPO</th>
                        <th className="p-3">DESCRIPCIÓN / ESPECIFICACIÓN</th>
                        <th className="p-3 text-center w-28">CANTIDAD</th>
                        <th className="p-3 w-48">ÁREA</th>
                        <th className="p-3 text-center w-20">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                      {rows.map((row, index) => (
                        <tr key={row.id} className="hover:bg-slate-900/40 transition">
                          
                          {/* Nro */}
                          <td className="p-3 text-center font-bold text-blue-400 font-mono">
                            #{index + 1}
                          </td>

                          {/* TIPO */}
                          <td className="p-2">
                            <select
                              value={row.toolType}
                              onChange={(e) => handleRowChange(index, 'toolType', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {TOOL_TYPES_PRESETS.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </td>

                          {/* DESCRIPCIÓN */}
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="Ej. Juego de destornilladores 1000V aislados..."
                              value={row.description}
                              onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            />
                          </td>

                          {/* CANTIDAD */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={row.quantity}
                              onChange={(e) => handleRowChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full text-center bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-2 py-2 text-xs font-extrabold text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>

                          {/* ÁREA */}
                          <td className="p-2">
                            <select
                              value={row.area}
                              onChange={(e) => handleRowChange(index, 'area', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-2.5 py-2 text-[11px] font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                            >
                              {TECHNICAL_AREAS.map((a) => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                              <option value={getEffectiveArea()}>
                                {getEffectiveArea()}
                              </option>
                            </select>
                          </td>

                          {/* ACCIONES */}
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDuplicateRow(index)}
                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded-lg transition"
                                title="Duplicar Fila"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(index)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
                                title="Eliminar Fila"
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

                <div className="flex justify-between items-center pt-2 text-xs text-slate-400 font-medium">
                  <span>Total de ítems agregados: <strong className="text-white font-mono">{rows.length}</strong></span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Agregar otra fila de herramienta
                  </button>
                </div>

              </div>

              {/* BOTÓN ENVIAR */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm px-8 py-4 rounded-2xl shadow-xl hover:shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Registrando Requerimiento...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Enviar y Registrar Requerimiento Masivo</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>

        ) : (

          /* PESTAÑA HISTORIAL DE SOLICITUDES */
          <div className="space-y-6 max-w-5xl mx-auto">
            
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Historial de Requerimientos Masivos de Herramientas
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Filtra y revisa los requerimientos enviados por los supervisores de cada Área Técnica.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-auto"
                  >
                    <option value="TODAS">Ver Todas las Áreas Técnicas</option>
                    {TECHNICAL_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>

                  <button
                    onClick={fetchHistory}
                    disabled={loadingHistory}
                    className="p-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl transition"
                    title="Actualizar"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-xs text-slate-400">Cargando solicitudes...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                  No se registraron requerimientos de herramientas para el área seleccionada.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-slate-900 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
                        <th className="p-3 text-center">N° Folio</th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Supervisor</th>
                        <th className="p-3">Área Técnica</th>
                        <th className="p-3 text-center">Herramientas</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950">
                      {historyList.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-900/50 transition">
                          <td className="p-3 text-center font-bold font-mono text-blue-400">
                            #{req.folio}
                          </td>
                          <td className="p-3 font-mono text-slate-300 font-semibold">
                            {req.requestCode}
                          </td>
                          <td className="p-3 font-bold text-white">
                            {req.supervisorName}
                          </td>
                          <td className="p-3 font-semibold text-slate-300 uppercase text-[11px]">
                            {req.area}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-200">
                            {req.itemCount} ítem(s)
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                              req.status === 'Aprobado' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : req.status === 'En Revisión' 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : req.status === 'Rechazado' 
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="p-3 text-center flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewDetails(req.id)}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl transition text-[11px]"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Ver / Imprimir
                            </button>
                            <button
                              onClick={() => handleDeleteRequest(req.id)}
                              className="p-1.5 text-red-400 hover:bg-red-950/40 rounded-lg transition border border-red-900/40"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 text-center text-xs text-slate-500 font-semibold print:hidden mt-auto">
        <p>ENDE ORURO - Sistema de Requerimiento de Herramientas © {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
}
