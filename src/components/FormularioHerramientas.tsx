'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Trash2, Save, Printer, RefreshCw, 
  User, FileText, ArrowLeft, Minus, Filter, Tag, Check
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
  showTabs?: boolean;
  initialTab?: 'create' | 'history';
}

export default function FormularioHerramientas({ 
  onBackToMainApp, 
  showTabs = false, 
  initialTab = 'create' 
}: FormularioHerramientasProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>(initialTab);

  // Estados del Formulario (Todo en MAYÚSCULAS)
  const [supervisorName, setSupervisorName] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>(TECHNICAL_AREAS[0]);
  const [customArea, setCustomArea] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [justification, setJustification] = useState('');
  
  // Lista de Herramientas (Inicia con SOLO 1 herramienta por defecto)
  const [rows, setRows] = useState<FormRowItem[]>([
    { id: '1', itemNumber: 1, toolType: 'HERRAMIENTA MANUAL', description: '', quantity: 1, area: TECHNICAL_AREAS[0] }
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

  // Sincronizar área seleccionada en todas las filas
  useEffect(() => {
    const currentArea = selectedArea === 'OTRA' ? (customArea.toUpperCase() || 'ÁREA TÉCNICA') : selectedArea;
    setRows(prevRows => prevRows.map(row => ({
      ...row,
      area: currentArea
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
    return selectedArea === 'OTRA' ? (customArea.trim().toUpperCase() || 'ÁREA TÉCNICA') : selectedArea;
  };

  const handleAddRow = () => {
    const newId = Date.now().toString();
    const effectiveArea = getEffectiveArea();
    setRows(prev => [
      ...prev,
      {
        id: newId,
        itemNumber: prev.length + 1,
        toolType: 'HERRAMIENTA MANUAL',
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
        title: 'Mínimo 1 Herramienta',
        text: 'La solicitud debe tener al menos una herramienta.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }
    const updated = rows.filter((_, i) => i !== index).map((row, idx) => ({
      ...row,
      itemNumber: idx + 1
    }));
    setRows(updated);
  };

  const handleRowChange = (index: number, field: keyof FormRowItem, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      const valStr = typeof value === 'string' ? value.toUpperCase() : value;
      updated[index] = { ...updated[index], [field]: valStr };
      return updated;
    });
  };

  const handleQuantityStep = (index: number, delta: number) => {
    setRows(prev => {
      const updated = [...prev];
      const currentQty = Number(updated[index].quantity) || 1;
      updated[index] = { ...updated[index], quantity: Math.max(1, currentQty + delta) };
      return updated;
    });
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveArea = getEffectiveArea();

    if (!supervisorName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre Requerido',
        text: 'Por favor escriba el Nombre del Supervisor o Solicitante.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    const invalidItems = rows.filter(r => !r.description || !r.description.trim());
    if (invalidItems.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción Incompleta',
        text: 'Por favor complete la descripción de cada herramienta.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        supervisorName: supervisorName.trim().toUpperCase(),
        area: effectiveArea,
        justification: justification.trim().toUpperCase(),
        priority,
        items: rows.map((r, index) => ({
          itemNumber: index + 1,
          toolType: (r.toolType || 'HERRAMIENTA').trim().toUpperCase(),
          description: r.description.trim().toUpperCase(),
          quantity: Number(r.quantity) || 1,
          area: effectiveArea
        }))
      };

      const result = await createToolRequest(payload);

      if (result.success && result.requestId) {
        Swal.fire({
          icon: 'success',
          title: '¡Solicitud Registrada!',
          html: `
            <div class="text-left text-sm space-y-2">
              <p class="font-bold text-slate-800">Se ha guardado el requerimiento de herramientas en MAYÚSCULAS.</p>
              <div class="bg-blue-50 p-3 rounded-xl border border-blue-200 font-mono text-xs text-blue-900">
                <p><strong>N° Folio:</strong> #${result.folio}</p>
                <p><strong>Código:</strong> ${result.requestCode}</p>
                <p><strong>Área:</strong> ${effectiveArea}</p>
                <p><strong>Solicitante:</strong> ${supervisorName.trim().toUpperCase()}</p>
                <p><strong>Total Items:</strong> ${rows.length}</p>
              </div>
            </div>
          `,
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'Ver Documento de Solicitud'
        }).then(() => {
          handleViewDetails(result.requestId);
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al Guardar',
          text: result.error || 'No se pudo guardar la solicitud.',
          confirmButtonColor: '#ef4444'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error Inesperado',
        text: err?.message || 'Error al procesar el envío.',
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
        text: res.error || 'No se pudo cargar la información.',
        confirmButtonColor: '#2563eb'
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
        text: `Nuevo estado: ${newStatus}`,
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleDeleteRequest = (requestId: string) => {
    Swal.fire({
      title: '¿Eliminar esta Solicitud?',
      text: 'Esta acción removerá la solicitud del sistema.',
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
            text: 'Solicitud eliminada.',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      
      {/* HEADER LIMPIO Y CLARO CON LOGO ENDE */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onBackToMainApp && (
              <button 
                onClick={onBackToMainApp}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl transition border border-slate-200 flex items-center justify-center shrink-0"
                title="Volver"
              >
                <ArrowLeft className="w-6 h-6 text-slate-900" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <img 
                src="/logo-ende.png" 
                alt="ENDE ORURO" 
                className="h-11 sm:h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                  ENDE CORPORACIÓN
                </h1>
                <p className="text-xs sm:text-sm text-blue-700 font-black uppercase tracking-wide">
                  Requerimiento Masivo de Herramientas
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Pestañas (Solo administradores) */}
          {showTabs && (
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => { setViewingRequest(null); setActiveTab('create'); }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black transition ${activeTab === 'create' && !viewingRequest ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Wrench className="w-4 h-4 text-blue-600" />
                Nueva Solicitud
              </button>

              <button
                onClick={() => { setViewingRequest(null); setActiveTab('history'); }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-black transition ${activeTab === 'history' && !viewingRequest ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                Historial Solicitudes
              </button>
            </div>
          )}

        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6">
        
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-base font-bold text-slate-700">Cargando documento...</p>
          </div>
        ) : viewingRequest ? (
          
          /* DOCUMENTO DE IMPRESIÓN */
          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingRequest(null)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition border border-slate-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Formulario
                </button>
                <div>
                  <h3 className="text-base font-black text-slate-900">Folio #{viewingRequest.folio}</h3>
                  <p className="text-xs text-slate-600 font-bold">{viewingRequest.requestCode} | {viewingRequest.area}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                <select
                  value={viewingRequest.status}
                  onChange={(e) => handleUpdateStatus(viewingRequest.id, e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm font-extrabold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Pendiente">Estado: Pendiente</option>
                  <option value="En Revisión">Estado: En Revisión</option>
                  <option value="Aprobado">Estado: Aprobado</option>
                  <option value="Rechazado">Estado: Rechazado</option>
                </select>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow transition"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Documento
                </button>

                <button
                  onClick={() => handleDeleteRequest(viewingRequest.id)}
                  className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition"
                  title="Eliminar Solicitud"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DOCUMENTO OFICIAL INSTITUCIONAL */}
            <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-xl max-w-4xl mx-auto print:shadow-none print:border-none print:w-full print:p-0 font-sans">
              
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  <img 
                    src="/logo-ende.png" 
                    alt="ENDE CORPORACION" 
                    className="h-12 w-auto object-contain"
                  />
                  <div>
                    <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">ENDE ORURO - DEPARTAMENTO TÉCNICO</h2>
                    <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">SOLICITUD DE REQUERIMIENTO MASIVO DE HERRAMIENTAS</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1 rounded">
                    N° FOLIO: #{viewingRequest.folio}
                  </div>
                  <p className="text-[11px] text-slate-600 font-bold mt-1 font-mono">{viewingRequest.requestCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm mb-6">
                <div>
                  <span className="font-bold text-slate-500 block uppercase text-xs">Supervisor / Solicitante:</span>
                  <span className="font-black text-slate-900 text-sm sm:text-base uppercase">{viewingRequest.supervisorName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block uppercase text-xs">Área Técnica:</span>
                  <span className="font-black text-blue-900 text-sm sm:text-base uppercase">{viewingRequest.area}</span>
                </div>
              </div>

              <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-blue-600 pl-2">
                DETALLE DE HERRAMIENTAS SOLICITADAS
              </h3>

              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black text-left">
                      <th className="p-3 text-center w-14 border border-slate-900">NRO</th>
                      <th className="p-3 w-52 border border-slate-900">TIPO DE HERRAMIENTA</th>
                      <th className="p-3 border border-slate-900">DESCRIPCIÓN Y ESPECIFICACIÓN</th>
                      <th className="p-3 text-center w-28 border border-slate-900">CANTIDAD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 border border-slate-300">
                    {viewingItems.map((item) => (
                      <tr key={item.id || item.itemNumber}>
                        <td className="p-3 text-center font-black font-mono border-r border-slate-300">{item.itemNumber}</td>
                        <td className="p-3 font-black text-slate-900 uppercase border-r border-slate-300">{item.toolType}</td>
                        <td className="p-3 text-slate-900 font-bold uppercase border-r border-slate-300">{item.description}</td>
                        <td className="p-3 text-center font-black text-blue-900 text-base font-mono">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-12 pt-14 text-center text-xs sm:text-sm">
                <div>
                  <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                  <p className="font-black text-slate-900 uppercase">{viewingRequest.supervisorName}</p>
                  <p className="text-xs text-slate-600 font-bold uppercase">SUPERVISOR DE {viewingRequest.area}</p>
                </div>
                <div>
                  <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                  <p className="font-black text-slate-900 uppercase">JEFATURA DE ADQUISICIONES</p>
                  <p className="text-xs text-slate-600 font-bold uppercase">ENDE ORURO</p>
                </div>
              </div>

            </div>

          </div>

        ) : activeTab === 'create' ? (

          /* FORMULARIO BLANCO CON TEXTO GRANDE Y AUTO-MAYÚSCULAS */
          <form onSubmit={handleSubmitRequest} className="space-y-6">
            
            {/* INFORMACIÓN DEL SOLICITANTE Y ÁREA */}
            <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-300 shadow-sm space-y-5">
              
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                    Datos del Supervisor Solicitante
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 font-bold">
                    Escriba su nombre y seleccione su Área Técnica
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Nombre del Supervisor en MAYÚSCULAS */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                    Nombre del Supervisor / Solicitante <span className="text-red-600 text-base">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="EJ. ING. MARIO GÓMEZ"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm sm:text-base font-black uppercase rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-600 transition shadow-inner"
                  />
                </div>

                {/* Selección de las 5 Áreas Técnicas */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                    Área Técnica de ENDE <span className="text-red-600 text-base">*</span>
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm sm:text-base font-black rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-600 transition uppercase shadow-inner"
                  >
                    {TECHNICAL_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                    <option value="OTRA">+ OTRA ÁREA TÉCNICA...</option>
                  </select>
                </div>

              </div>

              {selectedArea === 'OTRA' && (
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                    Nombre del Área Personalizada
                  </label>
                  <input
                    type="text"
                    placeholder="Escriba el nombre del Área Técnica..."
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-sm sm:text-base font-black uppercase rounded-xl px-4 py-3"
                  />
                </div>
              )}

            </div>

            {/* LISTADO DE HERRAMIENTAS (TEXTO GRANDE Y BOTÓN ELIMINAR ESCRITO) */}
            <div className="space-y-4">
              
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-blue-700" />
                    Listado de Herramientas Solicitadas
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-600">
                    Ingrese el tipo, cantidad y descripción en MAYÚSCULAS
                  </p>
                </div>
              </div>

              {/* TARJETAS DE HERRAMIENTAS */}
              <div className="space-y-4">
                {rows.map((row, index) => (
                  <div 
                    key={row.id} 
                    className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-slate-300 shadow-md space-y-4 relative hover:border-blue-500 transition"
                  >
                    
                    {/* Encabezado Fila + Botón Eliminar Escrito e Intuitivo */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-blue-700 text-white font-mono font-black text-sm flex items-center justify-center shadow">
                          #{index + 1}
                        </span>
                        <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                          Herramienta #{index + 1}
                        </span>
                      </div>

                      {/* Botón de Eliminar ESCRITO CLARAMENTE para personas mayores */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-200 hover:border-red-300 font-black text-xs sm:text-sm px-4 py-2 rounded-xl transition flex items-center justify-center gap-2 self-end sm:self-auto shadow-sm"
                        title="Quitar esta herramienta de la lista"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                        <span>BORRAR ESTA HERRAMIENTA</span>
                      </button>
                    </div>

                    {/* Campos de la Herramienta (Tipo de Herramienta LIBRE + Cantidad + Descripción) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      
                      {/* Tipo de Herramienta LIBRE (Input de texto en MAYÚSCULAS) */}
                      <div className="sm:col-span-6 space-y-1.5">
                        <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                          Tipo de Herramienta <span className="text-slate-500 font-bold">(Escriba libremente)</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="EJ. HERRAMIENTA MANUAL, ELÉCTRICA..."
                          value={row.toolType}
                          onChange={(e) => handleRowChange(index, 'toolType', e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm sm:text-base font-black uppercase rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 shadow-inner"
                        />
                      </div>

                      {/* Cantidad con Botones Táctiles Grandes */}
                      <div className="sm:col-span-6 space-y-1.5">
                        <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                          Cantidad Solicitada
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuantityStep(index, -1)}
                            className="w-12 h-12 rounded-xl bg-slate-200 hover:bg-slate-300 border-2 border-slate-400 font-black text-xl text-slate-900 flex items-center justify-center shrink-0 transition shadow-sm"
                          >
                            <Minus className="w-5 h-5 stroke-[3]" />
                          </button>
                          
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full text-center bg-slate-50 border-2 border-slate-300 rounded-xl py-2.5 text-base sm:text-lg font-black text-slate-900 font-mono shadow-inner"
                          />

                          <button
                            type="button"
                            onClick={() => handleQuantityStep(index, 1)}
                            className="w-12 h-12 rounded-xl bg-slate-200 hover:bg-slate-300 border-2 border-slate-400 font-black text-xl text-slate-900 flex items-center justify-center shrink-0 transition shadow-sm"
                          >
                            <Plus className="w-5 h-5 stroke-[3]" />
                          </button>
                        </div>
                      </div>

                      {/* Descripción Completa en MAYÚSCULAS */}
                      <div className="sm:col-span-12 space-y-1.5">
                        <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase">
                          Descripción y Especificación Técnica <span className="text-red-600 text-base">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="EJ. ALICATE UNIVERSAL DIELÉCTRICO 1000V DE 8 PULGADAS STANLEY..."
                          value={row.description}
                          onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm sm:text-base font-black uppercase rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-600 transition shadow-inner"
                        />
                      </div>

                    </div>

                  </div>
                ))}
              </div>

              {/* BOTÓN RESALTADO DESTACADO "+ AGREGAR OTRA HERRAMIENTA" */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm sm:text-base py-4.5 px-6 rounded-2xl shadow-xl hover:shadow-blue-500/30 transition border-2 border-blue-400 flex items-center justify-center gap-3 tracking-wider uppercase"
                >
                  <Plus className="w-6 h-6 text-amber-300 stroke-[3]" />
                  <span>+ AGREGAR OTRA HERRAMIENTA AL PEDIDO</span>
                </button>
              </div>

              {/* BOTÓN ENVIAR */}
              <div className="pt-4 border-t-2 border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-base sm:text-lg py-5 px-6 rounded-2xl shadow-2xl transition flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                      <span>ENVIANDO SOLICITUD...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-6 h-6 text-emerald-400" />
                      <span>ENVIAR REQUERIMIENTO MASIVO</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </form>

        ) : (

          /* HISTORIAL Y CONTROL (PANEL ADMINISTRACIÓN) */
          <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-300 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-700" />
                  Control de Requerimientos Enviados
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-600">
                  Solicitudes enviadas por supervisores de área técnica
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm font-black rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-auto uppercase"
                >
                  <option value="TODAS">TODAS LAS ÁREAS TÉCNICAS</option>
                  {TECHNICAL_AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className="p-2.5 bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl transition"
                  title="Actualizar"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <p className="text-xs text-slate-600 font-bold">Cargando requerimientos...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs sm:text-sm font-bold border-2 border-dashed border-slate-200 rounded-xl">
                No hay solicitudes de requerimientos registradas para el área seleccionada.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-300">
                <table className="w-full border-collapse text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase">
                      <th className="p-3 text-center">N° Folio</th>
                      <th className="p-3">Código</th>
                      <th className="p-3">Supervisor</th>
                      <th className="p-3">Área Técnica</th>
                      <th className="p-3 text-center">Herramientas</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {historyList.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-black font-mono text-blue-700">
                          #{req.folio}
                        </td>
                        <td className="p-3 font-mono text-slate-700 font-bold">
                          {req.requestCode}
                        </td>
                        <td className="p-3 font-black text-slate-900 uppercase">
                          {req.supervisorName}
                        </td>
                        <td className="p-3 font-black text-slate-800 uppercase text-xs">
                          {req.area}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-slate-900">
                          {req.itemCount} ítem(s)
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase border-2 ${
                            req.status === 'Aprobado' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : req.status === 'En Revisión' 
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : req.status === 'Rechazado' 
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-blue-50 text-blue-800 border-blue-300'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewDetails(req.id)}
                            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-black px-3 py-1.5 rounded-lg transition text-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Ver / Imprimir
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
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
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs sm:text-sm text-slate-600 font-black print:hidden mt-auto">
        <p>ENDE ORURO - Sistema de Requerimiento de Herramientas © {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
}
