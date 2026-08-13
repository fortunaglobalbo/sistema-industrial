'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Trash2, Copy, Save, Printer, RefreshCw, 
  User, FileText, ArrowLeft, Minus, Filter, Tag, Check, X
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
  showTabs?: boolean;
  initialTab?: 'create' | 'history';
}

export default function FormularioHerramientas({ 
  onBackToMainApp, 
  showTabs = false, 
  initialTab = 'create' 
}: FormularioHerramientasProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>(initialTab);
  
  // Lista de tipos de herramientas gestionables dinámicamente
  const [toolTypesList, setToolTypesList] = useState<string[]>([...TOOL_TYPES_PRESETS]);
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);

  // Estados del Formulario
  const [supervisorName, setSupervisorName] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>(TECHNICAL_AREAS[0]);
  const [customArea, setCustomArea] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [justification, setJustification] = useState('');
  
  // Lista de Herramientas (Inicia con SOLO 1 herramienta por defecto)
  const [rows, setRows] = useState<FormRowItem[]>([
    { id: '1', itemNumber: 1, toolType: 'Herramienta Manual', description: '', quantity: 1, area: TECHNICAL_AREAS[0] }
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
    const currentArea = selectedArea === 'OTRA' ? (customArea || 'ÁREA TÉCNICA') : selectedArea;
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
        toolType: toolTypesList[0] || 'Herramienta Manual',
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
        title: 'Mínimo de ítems',
        text: 'La solicitud debe contener al menos 1 herramienta.',
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
    if (field === 'toolType' && value === 'NUEVO_TIPO_OPTION') {
      setShowAddTypeModal(true);
      return;
    }

    setRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
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

  // Agregar nuevo tipo personalizado a la lista de tipos
  const handleAddNewToolType = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customTypeInput.trim();
    if (!trimmed) return;

    if (!toolTypesList.includes(trimmed)) {
      setToolTypesList(prev => [...prev, trimmed]);
    }
    
    // Asignar el nuevo tipo a la última fila o actual
    setRows(prev => prev.map((row, i) => i === prev.length - 1 ? { ...row, toolType: trimmed } : row));
    
    setCustomTypeInput('');
    setShowAddTypeModal(false);

    Swal.fire({
      icon: 'success',
      title: 'Tipo Agregado',
      text: `Se agregó "${trimmed}" a la lista de tipos de herramientas.`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleRemoveToolType = (typeToRemove: string) => {
    if (toolTypesList.length <= 1) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Debe haber al menos un tipo de herramienta disponible.' });
      return;
    }
    setToolTypesList(prev => prev.filter(t => t !== typeToRemove));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveArea = getEffectiveArea();

    if (!supervisorName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre Requerido',
        text: 'Por favor ingrese el Nombre del Supervisor / Solicitante.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    const invalidItems = rows.filter(r => !r.description || !r.description.trim());
    if (invalidItems.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'DESCRIPCIÓN Incompleta',
        text: 'Por favor ingrese la descripción de cada herramienta en el pedido.',
        confirmButtonColor: '#2563eb'
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
          area: effectiveArea
        }))
      };

      const result = await createToolRequest(payload);

      if (result.success && result.requestId) {
        Swal.fire({
          icon: 'success',
          title: '¡Solicitud Enviada con Éxito!',
          html: `
            <div class="text-left text-xs space-y-2">
              <p class="font-medium text-slate-700">Se ha guardado el requerimiento masivo para la Jefatura de Adquisiciones.</p>
              <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 font-mono text-xs text-blue-900">
                <p><strong>N° Folio:</strong> #${result.folio}</p>
                <p><strong>Código:</strong> ${result.requestCode}</p>
                <p><strong>Área:</strong> ${effectiveArea}</p>
                <p><strong>Supervisor:</strong> ${supervisorName.trim()}</p>
                <p><strong>Total Herramientas:</strong> ${rows.length}</p>
              </div>
            </div>
          `,
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'Ver Documento Generado'
        }).then(() => {
          handleViewDetails(result.requestId);
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al Guardar',
          text: result.error || 'No se pudo enviar la solicitud.',
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
      title: '¿Eliminar Solicitud?',
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
      
      {/* HEADER PRINCIPAL */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onBackToMainApp && (
              <button 
                onClick={onBackToMainApp}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition border border-slate-200 flex items-center justify-center shrink-0"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <img 
                src="/logo-ende.png" 
                alt="ENDE ORURO" 
                className="h-10 w-auto object-contain"
              />
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  ENDE CORPORACIÓN
                </h1>
                <p className="text-xs text-blue-700 font-bold uppercase tracking-wide">
                  Requerimiento Masivo de Herramientas
                </p>
              </div>
            </div>
          </div>

          {/* Renderizar selector de pestañas SOLO si está habilitado por la administración */}
          {showTabs && (
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
              <button
                onClick={() => { setViewingRequest(null); setActiveTab('create'); }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold transition ${activeTab === 'create' && !viewingRequest ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Wrench className="w-4 h-4 text-blue-600" />
                Nueva Solicitud
              </button>

              <button
                onClick={() => { setViewingRequest(null); setActiveTab('history'); }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold transition ${activeTab === 'history' && !viewingRequest ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                Historial de Solicitudes
              </button>
            </div>
          )}

        </div>
      </header>

      {/* MODAL PARA AGREGAR NUEVO TIPO DE HERRAMIENTA */}
      {showAddTypeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                Agregar Nuevo Tipo de Herramienta
              </h3>
              <button 
                onClick={() => setShowAddTypeModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewToolType} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Nombre del Tipo / Categoría
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej. Herramienta Neumática, Equipo Hidráulico..."
                  value={customTypeInput}
                  onChange={(e) => setCustomTypeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTypeModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow"
                >
                  Guardar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUERPO PRINCIPAL */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6">
        
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-bold text-slate-600">Cargando detalles de la solicitud...</p>
          </div>
        ) : viewingRequest ? (
          
          /* COMPROBANTE OFICIAL PARA IMPRIMIR / DOCUMENTO */
          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingRequest(null)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-300"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Formulario
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Folio #{viewingRequest.folio}</h3>
                  <p className="text-xs text-slate-500">{viewingRequest.requestCode} | {viewingRequest.area}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                <select
                  value={viewingRequest.status}
                  onChange={(e) => handleUpdateStatus(viewingRequest.id, e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Pendiente">Estado: Pendiente</option>
                  <option value="En Revisión">Estado: En Revisión</option>
                  <option value="Aprobado">Estado: Aprobado</option>
                  <option value="Rechazado">Estado: Rechazado</option>
                </select>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow transition"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Comprobante
                </button>

                <button
                  onClick={() => handleDeleteRequest(viewingRequest.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition"
                  title="Eliminar Solicitud"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* VISTA OFICIAL INSTITUCIONAL */}
            <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-xl max-w-4xl mx-auto print:shadow-none print:border-none print:w-full print:p-0 font-sans">
              
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  <img 
                    src="/logo-ende.png" 
                    alt="ENDE CORPORACION" 
                    className="h-12 w-auto object-contain"
                  />
                  <div>
                    <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">ENDE ORURO - DEPARTAMENTO TÉCNICO</h2>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">SOLICITUD DE REQUERIMIENTO MASIVO DE HERRAMIENTAS</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1 rounded">
                    N° FOLIO: #{viewingRequest.folio}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 font-mono">{viewingRequest.requestCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
                <div>
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Supervisor / Solicitante:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{viewingRequest.supervisorName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">Área Técnica:</span>
                  <span className="font-extrabold text-blue-900 text-sm uppercase">{viewingRequest.area}</span>
                </div>
              </div>

              <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 mb-3 border-l-4 border-blue-600 pl-2">
                DETALLE DE HERRAMIENTAS SOLICITADAS
              </h3>

              <div className="overflow-x-auto mb-8">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-left">
                      <th className="p-2.5 text-center w-12 border border-slate-900">NRO</th>
                      <th className="p-2.5 w-48 border border-slate-900">TIPO DE HERRAMIENTA</th>
                      <th className="p-2.5 border border-slate-900">DESCRIPCIÓN Y ESPECIFICACIÓN</th>
                      <th className="p-2.5 text-center w-24 border border-slate-900">CANTIDAD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 border border-slate-300">
                    {viewingItems.map((item) => (
                      <tr key={item.id || item.itemNumber}>
                        <td className="p-2.5 text-center font-bold font-mono border-r border-slate-300">{item.itemNumber}</td>
                        <td className="p-2.5 font-bold text-slate-800 border-r border-slate-300">{item.toolType}</td>
                        <td className="p-2.5 text-slate-900 border-r border-slate-300 font-medium">{item.description}</td>
                        <td className="p-2.5 text-center font-extrabold text-blue-900 text-sm font-mono">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-12 pt-14 text-center text-xs">
                <div>
                  <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                  <p className="font-extrabold text-slate-900 uppercase">{viewingRequest.supervisorName}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">SUPERVISOR DE {viewingRequest.area}</p>
                </div>
                <div>
                  <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                  <p className="font-extrabold text-slate-900 uppercase">JEFATURA DE ADQUISICIONES</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">ENDE ORURO</p>
                </div>
              </div>

            </div>

          </div>

        ) : activeTab === 'create' ? (

          /* FORMULARIO BLANCO (MÓVIL / RESPONSIVO) */
          <form onSubmit={handleSubmitRequest} className="space-y-5">
            
            {/* DATOS DEL SUPERVISOR Y SELECCIÓN DE ÁREA TÉCNICA */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Información del Solicitante
                  </h2>
                  <p className="text-xs text-slate-500">Ingrese sus datos para canalizar la compra masiva</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Nombre del Supervisor / Solicitante */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Supervisor / Solicitante <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ing. Juan Pérez (Supervisor)"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>

                {/* Selección de las 5 Áreas Técnicas */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Área Técnica de ENDE <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white text-slate-900 text-xs font-extrabold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 transition uppercase"
                  >
                    {TECHNICAL_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                    <option value="OTRA">+ OTRA ÁREA TÉCNICA...</option>
                  </select>
                </div>

              </div>

              {selectedArea === 'OTRA' && (
                <div>
                  <input
                    type="text"
                    placeholder="Escriba el nombre del área técnica..."
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900"
                  />
                </div>
              )}

            </div>

            {/* LISTADO DE HERRAMIENTAS (INICIA CON 1 SOLA HERRAMIENTA Y SIN AREA DESTINO INTERNA) */}
            <div className="space-y-4">
              
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    Listado de Herramientas Requeridas
                  </h3>
                  <p className="text-[11px] text-slate-500">Agregue cada item que necesita su equipo de trabajo</p>
                </div>
              </div>

              {/* TARJETAS DE ÍTEMS */}
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div 
                    key={row.id} 
                    className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative hover:border-blue-400 transition"
                  >
                    
                    {/* Encabezado Fila */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Herramienta #{index + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(index)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition text-xs flex items-center gap-1 font-semibold"
                          title="Duplicar item"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[11px]">Duplicar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Campos de la Herramienta (Sin campo Área Destino) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      
                      {/* Tipo de Herramienta + opción de agregar o gestionar tipos */}
                      <div className="sm:col-span-5 space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase">
                            TIPO DE HERRAMIENTA
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowAddTypeModal(true)}
                            className="text-[10px] text-blue-600 hover:underline font-bold"
                          >
                            + Nuevo Tipo
                          </button>
                        </div>

                        <select
                          value={row.toolType}
                          onChange={(e) => handleRowChange(index, 'toolType', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {toolTypesList.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                          <option value="NUEVO_TIPO_OPTION">+ AGREGAR OTRO TIPO...</option>
                        </select>
                      </div>

                      {/* Cantidad con botones grandes para celular */}
                      <div className="sm:col-span-7 space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">
                          CANTIDAD
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuantityStep(index, -1)}
                            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-slate-800 flex items-center justify-center shrink-0 transition"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full text-center bg-slate-50 border border-slate-300 rounded-xl py-1.5 text-sm font-black text-slate-900 font-mono"
                          />

                          <button
                            type="button"
                            onClick={() => handleQuantityStep(index, 1)}
                            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-slate-800 flex items-center justify-center shrink-0 transition"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Descripción Completa */}
                      <div className="sm:col-span-12 space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">
                          DESCRIPCIÓN Y ESPECIFICACIÓN TÉCNICA <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Alicate dieléctrico 1000V de 8 pulgadas marca Stanley / DeWalt..."
                          value={row.description}
                          onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                        />
                      </div>

                    </div>

                  </div>
                ))}
              </div>

              {/* BOTÓN RESALTADO DESTACADO PARA AGREGAR OTRA HERRAMIENTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition border border-blue-400/30 flex items-center justify-center gap-2 tracking-wide uppercase"
                >
                  <Plus className="w-5 h-5 text-amber-300" />
                  <span>+ Agregar Otra Herramienta al Pedido</span>
                </button>
              </div>

              {/* BOTÓN DE ENVÍO FINAL */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-wider"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                      <span>Enviando Requerimiento...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 text-emerald-400" />
                      <span>Enviar Requerimiento Masivo</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </form>

        ) : (

          /* HISTORIAL Y CONTROL (SOLO VISIBLE SI ES LLAMADO DESDE EL PANEL DE CONTROL ADMIN) */
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Control de Requerimientos Masivos Enviados
                </h3>
                <p className="text-xs text-slate-500">Administración de pedidos por áreas técnicas</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-auto uppercase"
                >
                  <option value="TODAS">Todas las Áreas Técnicas</option>
                  {TECHNICAL_AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className="p-2 bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl transition"
                  title="Actualizar"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <p className="text-xs text-slate-500">Cargando lista de requerimientos...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No hay solicitudes de requerimientos registradas para el área seleccionada.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                      <th className="p-3 text-center">N° Folio</th>
                      <th className="p-3">Código</th>
                      <th className="p-3">Supervisor</th>
                      <th className="p-3">Área Técnica</th>
                      <th className="p-3 text-center">Herramientas</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyList.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-bold font-mono text-blue-700">
                          #{req.folio}
                        </td>
                        <td className="p-3 font-mono text-slate-600 font-semibold">
                          {req.requestCode}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {req.supervisorName}
                        </td>
                        <td className="p-3 font-semibold text-slate-700 uppercase text-[11px]">
                          {req.area}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800">
                          {req.itemCount} ítem(s)
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            req.status === 'Aprobado' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : req.status === 'En Revisión' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : req.status === 'Rechazado' 
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleViewDetails(req.id)}
                            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition text-[11px]"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Ver / Imprimir
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
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

        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 font-semibold print:hidden mt-auto">
        <p>ENDE ORURO - Sistema de Requerimiento de Herramientas © {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
}
