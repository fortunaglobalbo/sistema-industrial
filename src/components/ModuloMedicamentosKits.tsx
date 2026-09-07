'use client';

import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, Plus, RefreshCw, Printer, Trash2, Edit2, 
  Search, ArrowLeft, Package, Sparkles, CheckCircle2, 
  Info, ShieldCheck, MapPin, User, Calendar, AlertCircle, 
  FileText, Building2, Car, Layers, Clock
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  saveMedicineKit, 
  getMedicineKits, 
  deleteMedicineKit,
  saveKitAssignment,
  getKitAssignments,
  deleteKitAssignment,
  getKitAssignmentSummary
} from '@/app/actions/medicineKit';
import { 
  MedicineItem, 
  MedicineKitInput, 
  MedicineKitData, 
  PREDEFINED_KITS,
  KitAssignmentInput,
  KitAssignmentData
} from '@/lib/medicineKitTypes';

interface ModuloMedicamentosKitsProps {
  showTabs?: boolean;
}

export default function ModuloMedicamentosKits({ showTabs = true }: ModuloMedicamentosKitsProps) {
  // Sub-pestaña principal: 'assignments' (Asignaciones por Área) o 'templates' (Armado de Kits)
  const [mainSubTab, setMainSubTab] = useState<'assignments' | 'templates'>('assignments');

  // Datos de Kits (Plantillas)
  const [kits, setKits] = useState<MedicineKitData[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [searchKitTerm, setSearchKitTerm] = useState('');

  // Vista de Plantillas: 'list' | 'form' | 'print'
  const [templateViewMode, setTemplateViewMode] = useState<'list' | 'form' | 'print'>('list');
  const [editingKitId, setEditingKitId] = useState<string | null>(null);
  const [kitName, setKitName] = useState('');
  const [kitDescription, setKitDescription] = useState('');
  const [kitItems, setKitItems] = useState<MedicineItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState('Tabletas');
  const [isSubmittingKit, setIsSubmittingKit] = useState(false);

  // Datos de Asignaciones por Área
  const [assignments, setAssignments] = useState<KitAssignmentData[]>([]);
  const [summary, setSummary] = useState({ total: 0, activos: 0, revision: 0, baja: 0 });
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [searchAssignmentTerm, setSearchAssignmentTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  // Vista de Asignaciones: 'list' | 'form' | 'print'
  const [assignmentViewMode, setAssignmentViewMode] = useState<'list' | 'form' | 'print'>('list');
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [selectedAssignmentForPrint, setSelectedAssignmentForPrint] = useState<KitAssignmentData | null>(null);

  // Form State Asignación
  const [assignKitName, setAssignKitName] = useState('');
  const [assignArea, setAssignArea] = useState('');
  const [assignLocationDetails, setAssignLocationDetails] = useState('');
  const [assignResponsibleName, setAssignResponsibleName] = useState('');
  const [assignResponsibleCi, setAssignResponsibleCi] = useState('');
  const [assignResponsiblePosition, setAssignResponsiblePosition] = useState('');
  const [assignAssignedDate, setAssignAssignedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignNextRevisionDate, setAssignNextRevisionDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3); // 3 meses de revisión periódica por defecto
    return d.toISOString().split('T')[0];
  });
  const [assignStatus, setAssignStatus] = useState<'activo' | 'revision' | 'baja'>('activo');
  const [assignObservations, setAssignObservations] = useState('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    loadKits();
    loadAssignments();
  };

  const loadKits = async () => {
    setLoadingKits(true);
    try {
      const list = await getMedicineKits();
      setKits(Array.isArray(list) ? list : []);
      if (list && list.length > 0 && !assignKitName) {
        setAssignKitName(list[0].name);
      }
    } catch (err) {
      console.error('Error al cargar kits:', err);
      setKits([]);
    } finally {
      setLoadingKits(false);
    }
  };

  const loadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const list = await getKitAssignments();
      setAssignments(Array.isArray(list) ? list : []);
      const sum = await getKitAssignmentSummary();
      setSummary(sum);
    } catch (err) {
      console.error('Error al cargar asignaciones:', err);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // --- SECCIÓN DE ASIGNACIONES POR ÁREA ---

  const handleOpenNewAssignment = () => {
    setEditingAssignmentId(null);
    setAssignKitName(kits.length > 0 ? kits[0].name : 'Kit Básico de Primeros Auxilios');
    setAssignArea('');
    setAssignLocationDetails('');
    setAssignResponsibleName('');
    setAssignResponsibleCi('');
    setAssignResponsiblePosition('');
    setAssignAssignedDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    setAssignNextRevisionDate(d.toISOString().split('T')[0]);
    setAssignStatus('activo');
    setAssignObservations('');
    setAssignmentViewMode('form');
  };

  const handleEditAssignment = (assign: KitAssignmentData) => {
    setEditingAssignmentId(assign.id);
    setAssignKitName(assign.kitName);
    setAssignArea(assign.area);
    setAssignLocationDetails(assign.locationDetails || '');
    setAssignResponsibleName(assign.responsibleName);
    setAssignResponsibleCi(assign.responsibleCi || '');
    setAssignResponsiblePosition(assign.responsiblePosition || '');
    setAssignAssignedDate(assign.assignedDate);
    setAssignNextRevisionDate(assign.nextRevisionDate || '');
    setAssignStatus(assign.status);
    setAssignObservations(assign.observations || '');
    setAssignmentViewMode('form');
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignArea.trim()) {
      Swal.fire({ icon: 'warning', title: 'Área Requerida', text: 'Especifique el área o ubicación del botiquín (ej. Subestación Central, Taller).' });
      return;
    }
    if (!assignResponsibleName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Responsable Requerido', text: 'Indique el nombre del responsable custodio del botiquín en esa área.' });
      return;
    }
    if (!assignKitName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Kit Requerido', text: 'Seleccione el tipo de botiquín asignado.' });
      return;
    }

    setIsSubmittingAssignment(true);
    const selectedKitObj = kits.find(k => k.name.toLowerCase() === assignKitName.toLowerCase());

    const payload: KitAssignmentInput = {
      kitId: selectedKitObj ? selectedKitObj.id : null,
      kitName: assignKitName,
      area: assignArea,
      locationDetails: assignLocationDetails,
      responsibleName: assignResponsibleName,
      responsibleCi: assignResponsibleCi,
      responsiblePosition: assignResponsiblePosition,
      assignedDate: assignAssignedDate,
      nextRevisionDate: assignNextRevisionDate,
      status: assignStatus,
      observations: assignObservations,
    };

    const res = await saveKitAssignment(payload, editingAssignmentId || undefined);
    setIsSubmittingAssignment(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: editingAssignmentId ? 'Asignación Actualizada' : 'Botiquín Asignado con Éxito',
        text: `El botiquín fue asignado a "${assignArea.toUpperCase()}" bajo custodia de "${assignResponsibleName}".`,
        timer: 2200,
        showConfirmButton: false
      });
      loadAssignments();
      setAssignmentViewMode('list');
    } else {
      Swal.fire({ icon: 'error', title: 'Error al Guardar', text: res.error });
    }
  };

  const handleDeleteAssignment = async (id: string, area: string) => {
    const confirm = await Swal.fire({
      title: `¿Eliminar Asignación?`,
      text: `Se eliminará el registro de botiquín asignado al área "${area}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteKitAssignment(id);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
        loadAssignments();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  const handlePrintAssignment = (assign: KitAssignmentData) => {
    // Buscar los ítems del kit para mostrarlos en el acta
    const matchingKit = kits.find(k => k.name.toLowerCase() === assign.kitName.toLowerCase());
    setSelectedAssignmentForPrint({
      ...assign,
      items: matchingKit ? matchingKit.items : []
    });
    setAssignmentViewMode('print');
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch = 
      !searchAssignmentTerm ||
      a.area.toLowerCase().includes(searchAssignmentTerm.toLowerCase()) ||
      a.responsibleName.toLowerCase().includes(searchAssignmentTerm.toLowerCase()) ||
      a.kitName.toLowerCase().includes(searchAssignmentTerm.toLowerCase()) ||
      (a.locationDetails && a.locationDetails.toLowerCase().includes(searchAssignmentTerm.toLowerCase()));

    const matchesStatus = 
      filterStatus === 'TODOS' || 
      a.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // --- SECCIÓN DE PLANTILLAS Y ARMADO DE KITS ---

  const handleOpenNewKit = () => {
    setEditingKitId(null);
    setKitName('');
    setKitDescription('');
    setKitItems([...PREDEFINED_KITS[0].items]);
    setTemplateViewMode('form');
  };

  const handleEditKit = (kit: MedicineKitData) => {
    setEditingKitId(kit.id);
    setKitName(kit.name);
    setKitDescription(kit.description || '');
    setKitItems([...kit.items]);
    setTemplateViewMode('form');
  };

  const handleLoadKitTemplate = (tpl: MedicineKitInput) => {
    setKitName(tpl.name);
    setKitDescription(tpl.description || '');
    setKitItems([...tpl.items]);
  };

  const handleItemQtyChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...kitItems];
    updated[index].quantity = newQty;
    setKitItems(updated);
  };

  const handleRemoveKitItem = (index: number) => {
    const updated = kitItems.filter((_, i) => i !== index);
    setKitItems(updated);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setKitItems([
      ...kitItems,
      {
        name: newItemName.trim().toUpperCase(),
        quantity: newItemQty > 0 ? newItemQty : 1,
        unit: newItemUnit
      }
    ]);
    setNewItemName('');
    setNewItemQty(1);
  };

  const handleSaveKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nombre Obligatorio', text: 'Especifique el nombre del kit (ej. Kit Básico).' });
      return;
    }
    if (kitItems.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Kit Vacío', text: 'Debe incluir al menos un medicamento o insumo.' });
      return;
    }

    setIsSubmittingKit(true);
    const payload: MedicineKitInput = {
      name: kitName,
      description: kitDescription,
      items: kitItems
    };

    const res = await saveMedicineKit(payload, editingKitId || undefined);
    setIsSubmittingKit(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: editingKitId ? 'Kit Actualizado' : 'Kit Creado',
        text: `El ${kitName.toUpperCase()} fue guardado con éxito.`,
        timer: 2000,
        showConfirmButton: false
      });
      loadKits();
      setTemplateViewMode('list');
    } else {
      Swal.fire({ icon: 'error', title: 'Error al Guardar', text: res.error });
    }
  };

  const handleDeleteKit = async (id: string, name: string) => {
    const confirm = await Swal.fire({
      title: `¿Eliminar ${name}?`,
      text: 'Se eliminará esta plantilla de kit de medicamentos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteMedicineKit(id);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
        loadKits();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  const filteredKits = kits.filter((k) => {
    if (!searchKitTerm) return true;
    const term = searchKitTerm.toLowerCase();
    return (
      k.name.toLowerCase().includes(term) ||
      (k.description && k.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* SELECTOR DE SUB-PESTAÑAS SUPERIOR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => {
              setMainSubTab('assignments');
              setAssignmentViewMode('list');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              mainSubTab === 'assignments'
                ? 'bg-[#002f6c] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            Asignación por Área y Responsable
          </button>
          <button
            onClick={() => {
              setMainSubTab('templates');
              setTemplateViewMode('list');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
              mainSubTab === 'templates'
                ? 'bg-[#002f6c] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Package className="w-4 h-4 text-rose-400" />
            Catálogo y Armado de Kits
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            disabled={loadingAssignments || loadingKits}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingAssignments || loadingKits) ? 'animate-spin text-blue-600' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 1: ASIGNACIÓN DE BOTIQUINES POR ÁREA Y RESPONSABLE               */}
      {/* ========================================================================= */}
      {mainSubTab === 'assignments' && (
        <div className="space-y-6">
          
          {/* VISTA 1.1: LISTADO DE ASIGNACIONES */}
          {assignmentViewMode === 'list' && (
            <div className="space-y-6">
              
              {/* BANNER PRINCIPAL DE ASIGNACIONES */}
              <div className="bg-[#002f6c] text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-blue-900">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-white/10 text-amber-400 rounded-2xl border border-white/20">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide">
                      Control y Asignación de Botiquines por Área
                    </h3>
                    <p className="text-xs text-blue-200 font-medium">
                      Los botiquines pertenecen a áreas físicas o móviles bajo la custodia de un responsable encargado
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleOpenNewAssignment}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition shadow cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Asignar Botiquín a un Área</span>
                  </button>
                </div>
              </div>

              {/* TARJETAS RESUMEN DE TOTALES */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Áreas con Botiquín</p>
                    <p className="text-base font-black text-slate-800">{summary.total}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Botiquines Activos</p>
                    <p className="text-base font-black text-slate-800">{summary.activos}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">En Revisión / Control</p>
                    <p className="text-base font-black text-slate-800">{summary.revision}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Kits Disponibles</p>
                    <p className="text-base font-black text-slate-800">{kits.length} tipos</p>
                  </div>
                </div>
              </div>

              {/* FILTROS Y BUSCADOR */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por área, responsable custodio o tipo de botiquín..."
                    value={searchAssignmentTerm}
                    onChange={(e) => setSearchAssignmentTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#002f6c]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full sm:w-44 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002f6c]"
                  >
                    <option value="TODOS">Todos los Estados</option>
                    <option value="activo">Solo Activos</option>
                    <option value="revision">En Revisión</option>
                    <option value="baja">Dados de Baja</option>
                  </select>
                </div>
              </div>

              {/* TABLA DE ASIGNACIONES */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loadingAssignments ? (
                  <div className="text-center py-16 text-xs font-bold text-slate-500">Cargando asignaciones...</div>
                ) : filteredAssignments.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs font-bold border-dashed rounded-2xl">
                    No se encontraron botiquines asignados con los filtros actuales.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
                          <th className="p-3.5 text-center w-12">N°</th>
                          <th className="p-3.5 text-left">Área / Ubicación</th>
                          <th className="p-3.5 text-left">Tipo de Botiquín</th>
                          <th className="p-3.5 text-left">Responsable Custodio</th>
                          <th className="p-3.5 text-center w-28">Fecha Entrega</th>
                          <th className="p-3.5 text-center w-28">Próx. Revisión</th>
                          <th className="p-3.5 text-center w-24">Estado</th>
                          <th className="p-3.5 text-center w-36">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAssignments.map((a, idx) => (
                          <tr key={a.id} className="hover:bg-slate-50/60 transition">
                            <td className="p-3.5 text-center font-bold font-mono text-slate-600">{idx + 1}</td>
                            <td className="p-3.5">
                              <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                {a.area}
                              </p>
                              {a.locationDetails && (
                                <p className="text-[11px] text-slate-500 mt-0.5 italic flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  {a.locationDetails}
                                </p>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1 text-slate-800 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                <Package className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                {a.kitName}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <p className="font-extrabold text-slate-900">{a.responsibleName}</p>
                              <p className="text-[11px] text-slate-600 font-mono">
                                {a.responsibleCi ? `C.I. ${a.responsibleCi}` : ''} {a.responsiblePosition ? `• ${a.responsiblePosition}` : ''}
                              </p>
                            </td>
                            <td className="p-3.5 text-center text-slate-600 font-medium">
                              {a.assignedDate}
                            </td>
                            <td className="p-3.5 text-center font-semibold text-slate-700">
                              {a.nextRevisionDate || '-'}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                a.status === 'activo'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : a.status === 'revision'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handlePrintAssignment(a)}
                                  className="flex items-center gap-1 bg-[#002f6c] hover:bg-[#003876] text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                                  title="Ver e Imprimir Acta Oficial de Custodia"
                                >
                                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                                  Acta
                                </button>
                                <button
                                  onClick={() => handleEditAssignment(a)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition cursor-pointer"
                                  title="Editar Asignación"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAssignment(a.id, a.area)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition cursor-pointer"
                                  title="Eliminar Asignación"
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

          {/* VISTA 1.2: FORMULARIO DE ASIGNACIÓN */}
          {assignmentViewMode === 'form' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setAssignmentViewMode('list')}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingAssignmentId ? 'Editar Asignación de Botiquín' : 'Asignar Botiquín a un Área'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Registro formal de ubicación y custodio responsable del botiquín
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
                {/* SELECTOR DE KIT */}
                <div>
                  <label className="block font-extrabold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-rose-600" />
                    Tipo de Botiquín a Asignar:
                  </label>
                  <select
                    value={assignKitName}
                    onChange={(e) => setAssignKitName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002f6c]"
                  >
                    {kits.map((k) => (
                      <option key={k.id} value={k.name}>
                        {k.name} ({k.items?.length || 0} medicamentos contenidos)
                      </option>
                    ))}
                  </select>
                </div>

                {/* DATOS DEL ÁREA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-extrabold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Área, Sección o Móvil: *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Subestación Vinto, Taller Mecánico, Camioneta N° 2..."
                      value={assignArea}
                      onChange={(e) => setAssignArea(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      Ubicación Específica en el Área:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Pared este junto al extintor N° 04, Guantera..."
                      value={assignLocationDetails}
                      onChange={(e) => setAssignLocationDetails(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* DATOS DEL RESPONSABLE CUSTODIO */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
                    <User className="w-4 h-4 text-[#002f6c]" />
                    Datos del Responsable Custodio
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block font-bold text-slate-700 mb-1">Nombre Completo: *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Ing. Mario Gomez"
                        value={assignResponsibleName}
                        onChange={(e) => setAssignResponsibleName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Cédula de Identidad:</label>
                      <input
                        type="text"
                        placeholder="Ej. 1234567 Or."
                        value={assignResponsibleCi}
                        onChange={(e) => setAssignResponsibleCi(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Cargo / Puesto:</label>
                      <input
                        type="text"
                        placeholder="Ej. Encargado de Subestación"
                        value={assignResponsiblePosition}
                        onChange={(e) => setAssignResponsiblePosition(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* FECHAS Y ESTADO */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-extrabold text-slate-800 uppercase mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Fecha de Entrega:
                    </label>
                    <input
                      type="date"
                      required
                      value={assignAssignedDate}
                      onChange={(e) => setAssignAssignedDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-800 uppercase mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Próxima Revisión:
                    </label>
                    <input
                      type="date"
                      value={assignNextRevisionDate}
                      onChange={(e) => setAssignNextRevisionDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-slate-800 uppercase mb-1">Estado:</label>
                    <select
                      value={assignStatus}
                      onChange={(e) => setAssignStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900"
                    >
                      <option value="activo">Activo / Conforme</option>
                      <option value="revision">Requiere Revisión</option>
                      <option value="baja">Dado de Baja</option>
                    </select>
                  </div>
                </div>

                {/* OBSERVACIONES */}
                <div>
                  <label className="block font-extrabold text-slate-800 uppercase mb-1">
                    Observaciones / N° de Precinto de Seguridad:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Precinto de seguridad N° 2038 colocado. En caso de rotura avisar a Seguridad Industrial."
                    value={assignObservations}
                    onChange={(e) => setAssignObservations(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setAssignmentViewMode('list')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAssignment}
                    className="px-5 py-2 bg-[#002f6c] hover:bg-[#003876] text-white font-black rounded-xl transition shadow cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAssignment ? 'Guardando...' : editingAssignmentId ? 'Actualizar Asignación' : 'Guardar Asignación'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VISTA 1.3: ACTA OFICIAL IMPRIMIBLE (.print-area) */}
          {assignmentViewMode === 'print' && selectedAssignmentForPrint && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border border-slate-200">
                <button
                  onClick={() => setAssignmentViewMode('list')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-300 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a la Lista
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Acta Oficial
                </button>
              </div>

              {/* DOCUMENTO OFICIAL LISTO PARA IMPRIMIR */}
              <div className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-sm max-w-4xl mx-auto font-sans">
                {/* MEMBRETE */}
                <div className="flex justify-between items-start border-b-2 border-[#002f6c] pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo_ende_deoruro.png"
                      alt="ENDE DEORURO"
                      className="h-12 w-auto object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-[#002f6c] text-white font-black text-[10px] px-2.5 py-1 rounded tracking-widest">
                      ACTA DE CUSTODIA
                    </span>
                    <p className="text-[9px] text-slate-500 font-mono mt-1">
                      Fecha: {new Date().toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>

                {/* TÍTULO */}
                <div className="text-center my-3 pb-2 border-b border-slate-200">
                  <h2 className="font-black text-base sm:text-lg text-slate-900 uppercase tracking-wide">
                    ACTA DE ASIGNACIÓN, ENTREGA Y CUSTODIA DE BOTIQUÍN DE PRIMEROS AUXILIOS
                  </h2>
                  <p className="text-xs font-extrabold text-[#002f6c] uppercase mt-0.5 tracking-wider">
                    DOTACIÓN COLECTIVA POR ÁREA OPERATIVA
                  </p>
                </div>

                {/* DATOS DEL ÁREA Y CUSTODIO */}
                <div className="grid grid-cols-2 gap-3 text-xs border border-slate-300 rounded-xl p-3 bg-slate-50/80 mb-4">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Área / Ubicación Asignada:</span>
                    <p className="font-black text-slate-900 text-sm">{selectedAssignmentForPrint.area}</p>
                    {selectedAssignmentForPrint.locationDetails && (
                      <p className="text-[11px] text-slate-600 italic mt-0.5">{selectedAssignmentForPrint.locationDetails}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Responsable Custodio del Área:</span>
                    <p className="font-black text-slate-900 text-sm">{selectedAssignmentForPrint.responsibleName}</p>
                    <p className="text-[11px] text-slate-600 font-mono">
                      C.I. {selectedAssignmentForPrint.responsibleCi || 'S/N'} • Cargo: {selectedAssignmentForPrint.responsiblePosition || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Tipo de Botiquín:</span>
                    <p className="font-bold text-slate-800">{selectedAssignmentForPrint.kitName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Fecha de Asignación / Próxima Revisión:</span>
                    <p className="font-bold text-slate-800">
                      Asignado: {selectedAssignmentForPrint.assignedDate} | Próx. Control: {selectedAssignmentForPrint.nextRevisionDate || 'A coordinar'}
                    </p>
                  </div>
                </div>

                {/* OBSERVACIONES / PRECINTO */}
                {selectedAssignmentForPrint.observations && (
                  <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg text-xs mb-4">
                    <span className="font-bold text-amber-900">Observaciones y Precinto:</span>
                    <p className="text-slate-700">{selectedAssignmentForPrint.observations}</p>
                  </div>
                )}

                {/* CONTENIDO DETALLADO DEL KIT */}
                <div className="mb-6">
                  <h4 className="font-black text-xs uppercase text-slate-800 mb-2 border-b pb-1">
                    Contenido e Insumos Médicos del Botiquín Entregado
                  </h4>
                  {selectedAssignmentForPrint.items && selectedAssignmentForPrint.items.length > 0 ? (
                    <table className="w-full border-collapse text-xs border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300">
                          <th className="p-2 text-center w-12 border-r border-slate-300">N°</th>
                          <th className="p-2 text-left border-r border-slate-300">Medicamento / Insumo</th>
                          <th className="p-2 text-center w-24 border-r border-slate-300">Cantidad</th>
                          <th className="p-2 text-center w-28">Unidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedAssignmentForPrint.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2 text-center font-mono border-r border-slate-300">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900 border-r border-slate-300">{it.name}</td>
                            <td className="p-2 text-center font-black text-slate-900 font-mono border-r border-slate-300">{it.quantity}</td>
                            <td className="p-2 text-center text-slate-600">{it.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Kit estándar de dotación completa para el área.</p>
                  )}
                </div>

                {/* CLÁUSULA DE CUSTODIA */}
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 text-[11px] text-slate-700 leading-relaxed mb-8">
                  <strong>COMPROMISO DE CUSTODIA:</strong> El Responsable Custodio declara recibir a satisfacción el botiquín de primeros auxilios con el contenido detallado, asumiendo la responsabilidad de mantenerlo en lugar visible, accesible, en condiciones higiénicas adecuadas y notificar inmediatamente a Seguridad Industrial en caso de uso o vencimiento de los insumos.
                </div>

                {/* FIRMAS */}
                <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-12 text-center text-xs">
                  <div className="flex flex-col items-center justify-end">
                    <div className="w-52 border-b-2 border-slate-800 pb-1 mb-1"></div>
                    <p className="font-black text-slate-900">{selectedAssignmentForPrint.responsibleName}</p>
                    <p className="text-[10px] text-slate-600 font-bold">RESPONSABLE CUSTODIO DEL ÁREA</p>
                    <p className="text-[9px] text-slate-400">C.I. {selectedAssignmentForPrint.responsibleCi || 'S/N'}</p>
                  </div>

                  <div className="flex flex-col items-center justify-end">
                    <div className="w-52 border-b-2 border-slate-800 pb-1 mb-1"></div>
                    <p className="font-black text-slate-900">SEGURIDAD INDUSTRIAL Y SALUD</p>
                    <p className="text-[10px] text-slate-600 font-bold">Entrega y Supervisión</p>
                    <p className="text-[9px] text-slate-400">ENDE DEORURO</p>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 2: CATÁLOGO Y CONFIGURACIÓN DE KITS (PLANTILLAS)                  */}
      {/* ========================================================================= */}
      {mainSubTab === 'templates' && (
        <div className="space-y-6">
          {/* VISTA 2.1: LISTADO DE PLANTILLAS */}
          {templateViewMode === 'list' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-rose-50 to-blue-50 border border-rose-200 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-rose-600 text-white rounded-2xl shadow">
                    <HeartPulse className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">
                      Catálogo y Armado de Kits de Medicamentos
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Configura el contenido y cantidades de medicamentos para cada tipo de botiquín (Básico, Cuadrilla, Vehicular)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setTemplateViewMode('print')}
                    className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Imprimir Catálogo</span>
                  </button>

                  <button
                    onClick={handleOpenNewKit}
                    className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-amber-300" />
                    <span>+ Crear Nuevo Kit</span>
                  </button>
                </div>
              </div>

              {/* BUSCADOR */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre de kit o descripción..."
                    value={searchKitTerm}
                    onChange={(e) => setSearchKitTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              {/* TARJETAS DE KITS CONFIGURADOS */}
              {loadingKits ? (
                <div className="text-center py-12 text-xs font-bold text-slate-500">Cargando kits...</div>
              ) : filteredKits.length === 0 ? (
                <div className="text-center py-14 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                  No se encontraron kits registrados.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredKits.map((kit) => (
                    <div
                      key={kit.id}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-rose-300 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                              {kit.items?.length || 0} Medicamentos
                            </span>
                            <h4 className="text-base font-black text-slate-900 mt-1">{kit.name}</h4>
                            {kit.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{kit.description}</p>
                            )}
                          </div>
                          <div className="p-2 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        </div>

                        {/* LISTA PREVIA DE MEDICAMENTOS */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 max-h-48 overflow-y-auto text-xs">
                          {kit.items && kit.items.length > 0 ? (
                            kit.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px] py-0.5">
                                <span className="font-semibold text-slate-800 truncate pr-2">• {it.name}</span>
                                <span className="font-mono font-black text-rose-700 shrink-0">
                                  {it.quantity} {it.unit}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic text-center py-2">Sin medicamentos asignados</p>
                          )}
                        </div>
                      </div>

                      {/* BOTONES ACCIÓN */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleEditKit(kit)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteKit(kit.id, kit.name)}
                          className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
                          title="Eliminar Kit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VISTA 2.2: FORMULARIO DE EDICIÓN O CREACIÓN DE KIT */}
          {templateViewMode === 'form' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setTemplateViewMode('list')}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingKitId ? 'Editar Plantilla de Kit' : 'Crear Nueva Plantilla de Kit'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Define los insumos y dosis que compondrán este tipo de botiquín
                    </p>
                  </div>
                </div>

                {/* PLANTILLAS RÁPIDAS */}
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Cargar:</span>
                  {PREDEFINED_KITS.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleLoadKitTemplate(tpl)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-rose-50 hover:text-rose-700 rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      {tpl.name.replace('Kit ', '')}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSaveKit} className="space-y-6 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-extrabold text-slate-800 uppercase mb-1">Nombre del Kit: *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Kit Básico de Primeros Auxilios"
                      value={kitName}
                      onChange={(e) => setKitName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-800 uppercase mb-1">Descripción / Destino:</label>
                    <input
                      type="text"
                      placeholder="Ej. Dotación recomendada para oficinas y cuadrillas"
                      value={kitDescription}
                      onChange={(e) => setKitDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                    />
                  </div>
                </div>

                {/* TABLA DE MEDICAMENTOS INCLUIDOS */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-rose-600" />
                      Medicamentos e Insumos Incluidos ({kitItems.length})
                    </h4>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    {kitItems.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800 flex-1">{it.name}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value, 10) || 1)}
                            className="w-16 bg-slate-50 border border-slate-300 rounded-lg p-1 text-center font-mono font-bold"
                          />
                          <span className="text-[11px] text-slate-600 font-semibold w-16">{it.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKitItem(idx)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* AGREGAR MEDICAMENTO PERSONALIZADO */}
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nuevo medicamento / insumo..."
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="flex-1 min-w-[200px] bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                      />
                      <input
                        type="number"
                        min="1"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(parseInt(e.target.value, 10) || 1)}
                        className="w-16 bg-white border border-slate-300 rounded-lg p-2 text-xs text-center font-mono font-bold"
                      />
                      <select
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold"
                      >
                        <option value="Tabletas">Tabletas</option>
                        <option value="Sobres">Sobres</option>
                        <option value="Frasco">Frasco</option>
                        <option value="Rollos">Rollos</option>
                        <option value="Unidades">Unidades</option>
                        <option value="Paquete">Paquete</option>
                        <option value="Tubo">Tubo</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddCustomItem}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-2 rounded-lg text-xs"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setTemplateViewMode('list')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingKit}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition shadow"
                  >
                    {isSubmittingKit ? 'Guardando...' : editingKitId ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VISTA 2.3: CATÁLOGO IMPRIMIBLE (.print-area) */}
          {templateViewMode === 'print' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border border-slate-200">
                <button
                  onClick={() => setTemplateViewMode('list')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-300 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a la Lista
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Catálogo
                </button>
              </div>

              <div className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-sm max-w-4xl mx-auto font-sans">
                <div className="flex justify-between items-start border-b-2 border-[#002f6c] pb-3 mb-4">
                  <img src="/logo_ende_deoruro.png" alt="ENDE DEORURO" className="h-12 w-auto object-contain mix-blend-multiply" />
                  <div className="text-right">
                    <span className="inline-block bg-[#002f6c] text-white font-black text-[10px] px-2.5 py-1 rounded tracking-widest">
                      CATÁLOGO OFICIAL
                    </span>
                    <p className="text-[9px] text-slate-500 font-mono mt-1">
                      Fecha: {new Date().toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>

                <div className="text-center my-3 pb-2 border-b border-slate-200">
                  <h2 className="font-black text-base sm:text-lg text-slate-900 uppercase">
                    CATÁLOGO OFICIAL DE KITS DE PRIMEROS AUXILIOS Y MEDICAMENTOS
                  </h2>
                  <p className="text-xs font-extrabold text-[#002f6c] uppercase mt-0.5">
                    ESTÁNDARES DE DOTACIÓN INSTITUCIONAL
                  </p>
                </div>

                <div className="space-y-6 my-6">
                  {kits.map((kit, idx) => (
                    <div key={kit.id} className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                        <div>
                          <h4 className="font-black text-sm text-slate-900">
                            {idx + 1}. {kit.name}
                          </h4>
                          {kit.description && <p className="text-[11px] text-slate-600">{kit.description}</p>}
                        </div>
                        <span className="text-xs font-black font-mono text-[#002f6c]">
                          {kit.items?.length || 0} Medicamentos
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                        {kit.items?.map((it, i) => (
                          <div key={i} className="flex justify-between bg-white p-2 rounded border border-slate-200 text-[11px]">
                            <span className="font-semibold text-slate-800 truncate pr-1">• {it.name}</span>
                            <span className="font-mono font-black text-rose-700 shrink-0">
                              x{it.quantity} {it.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-12 text-center text-xs">
                  <div className="flex flex-col items-center justify-end">
                    <div className="w-52 border-b-2 border-slate-800 pb-1 mb-1"></div>
                    <p className="font-black text-slate-900">RESPONSABLE DE ALMACÉN</p>
                    <p className="text-[10px] text-slate-500 font-bold">Dotación de Insumos</p>
                  </div>
                  <div className="flex flex-col items-center justify-end">
                    <div className="w-52 border-b-2 border-slate-800 pb-1 mb-1"></div>
                    <p className="font-black text-slate-900">SEGURIDAD INDUSTRIAL Y SALUD</p>
                    <p className="text-[10px] text-slate-500 font-bold">Vo.Bo. Supervisión</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
