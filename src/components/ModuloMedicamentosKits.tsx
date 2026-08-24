'use client';

import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, Plus, RefreshCw, Printer, Trash2, 
  Search, ArrowLeft, Calendar, User, ShieldCheck, 
  CheckCircle2, Package, Sparkles, AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  createMedicineKitDelivery, 
  getMedicineKitDeliveries, 
  deleteMedicineKitDelivery 
} from '@/app/actions/medicineKit';
import { 
  MedicineItem, 
  MedicineKitDeliveryInput, 
  MedicineKitDeliveryData, 
  PREDEFINED_KITS 
} from '@/lib/medicineKitTypes';

interface ModuloMedicamentosKitsProps {
  showTabs?: boolean;
}

export default function ModuloMedicamentosKits({ showTabs = true }: ModuloMedicamentosKitsProps) {
  const [deliveries, setDeliveries] = useState<MedicineKitDeliveryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Vistas: 'list' | 'form' | 'print'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'print'>('list');
  const [selectedPrintDelivery, setSelectedPrintDelivery] = useState<MedicineKitDeliveryData | null>(null);

  // Form State
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [kitName, setKitName] = useState(PREDEFINED_KITS[0].name);
  const [recipientName, setRecipientName] = useState('');
  const [recipientCi, setRecipientCi] = useState('');
  const [recipientPosition, setRecipientPosition] = useState('');
  const [recipientArea, setRecipientArea] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveredBy, setDeliveredBy] = useState('RESPONSABLE SEGURIDAD INDUSTRIAL');
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<MedicineItem[]>([...PREDEFINED_KITS[0].defaultItems]);

  // Nuevo ítem manual
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState('Tabletas');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const list = await getMedicineKitDeliveries(searchTerm);
    setDeliveries(list);
    setLoading(false);
  };

  const handleTemplateChange = (idx: number) => {
    setSelectedTemplateIndex(idx);
    const template = PREDEFINED_KITS[idx];
    setKitName(template.name);
    setItems([...template.defaultItems]);
  };

  const handleOpenNew = () => {
    setSelectedTemplateIndex(0);
    setKitName(PREDEFINED_KITS[0].name);
    setItems([...PREDEFINED_KITS[0].defaultItems]);
    setRecipientName('');
    setRecipientCi('');
    setRecipientPosition('');
    setRecipientArea('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setDeliveredBy('RESPONSABLE SEGURIDAD INDUSTRIAL');
    setObservations('');
    setViewMode('form');
  };

  const handleItemQtyChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...items];
    updated[index].quantity = newQty;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setItems([
      ...items,
      {
        name: newItemName.trim().toUpperCase(),
        quantity: newItemQty > 0 ? newItemQty : 1,
        unit: newItemUnit
      }
    ]);
    setNewItemName('');
    setNewItemQty(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nombre Obligatorio', text: 'Especifique el nombre de quien recibe el kit.' });
      return;
    }
    if (!recipientPosition.trim()) {
      Swal.fire({ icon: 'warning', title: 'Cargo Obligatorio', text: 'Especifique el cargo del trabajador o cuadrilla.' });
      return;
    }
    if (!recipientArea.trim()) {
      Swal.fire({ icon: 'warning', title: 'Área Obligatoria', text: 'Especifique el área, cuadrilla o vehículo asignado.' });
      return;
    }
    if (items.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Kit Vacío', text: 'Debe incluir al menos un medicamento en el kit.' });
      return;
    }

    setIsSubmitting(true);
    const payload: MedicineKitDeliveryInput = {
      kitName,
      recipientName,
      recipientCi,
      recipientPosition,
      recipientArea,
      deliveryDate,
      items,
      deliveredBy,
      observations
    };

    const res = await createMedicineKitDelivery(payload);
    setIsSubmitting(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Kit de Medicamentos Entregado',
        text: `Se registró la entrega de ${kitName} con Folio #${res.folio}.`,
        timer: 2000,
        showConfirmButton: false
      });
      loadData();
      setViewMode('list');
    } else {
      Swal.fire({ icon: 'error', title: 'Error al Registrar', text: res.error });
    }
  };

  const handleViewPrint = (del: MedicineKitDeliveryData) => {
    setSelectedPrintDelivery(del);
    setViewMode('print');
  };

  const handleDelete = async (id: string, name: string) => {
    const confirm = await Swal.fire({
      title: `¿Eliminar entrega de ${name}?`,
      text: 'Se eliminará este registro de entrega de medicamentos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteMedicineKitDelivery(id);
      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false });
        loadData();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.recipient_name.toLowerCase().includes(term) ||
      d.kit_name.toLowerCase().includes(term) ||
      d.recipient_area.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* VISTA 1: LISTADO DE ENTREGAS DE KITS */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* TARJETAS DE MÉTRICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-rose-100 text-rose-700 rounded-2xl">
                <HeartPulse className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Kits Entregados</p>
                <p className="text-2xl font-black font-mono text-slate-900">{deliveries.length}</p>
                <p className="text-[11px] text-slate-500 font-semibold">Botiquines y dotaciones</p>
              </div>
            </div>

            <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase">Total Medicamentos Suministrados</p>
                <p className="text-2xl font-black font-mono text-emerald-950">
                  {deliveries.reduce((acc, curr) => acc + (curr.items ? curr.items.reduce((s, it) => s + Number(it.quantity || 0), 0) : 0), 0)}
                </p>
                <p className="text-[11px] text-emerald-700 font-bold">Unidades / tabletas / frascos</p>
              </div>
            </div>

            <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4">
              <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase">Plantillas de Kits Activas</p>
                <p className="text-2xl font-black font-mono text-blue-950">{PREDEFINED_KITS.length}</p>
                <p className="text-[11px] text-blue-700 font-bold">Oficinas, Cuadrillas, Vehicular</p>
              </div>
            </div>

          </div>

          {/* BARRA DE ACCIONES Y BÚSQUEDA */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por beneficiario, tipo de kit o área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              onClick={handleOpenNew}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-5 py-3 rounded-xl transition shadow-lg"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>+ Armar y Entregar Kit de Medicamentos</span>
            </button>

          </div>

          {/* TABLA DE ENTREGAS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-600" />
                Historial de Kits de Medicamentos Entregados ({filteredDeliveries.length})
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
              <div className="text-center py-12 text-xs font-bold text-slate-500">Cargando entregas...</div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="text-center py-14 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                No se encontraron entregas de kits registradas.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-xs sm:text-sm text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-xs">
                      <th className="p-3 text-center w-12">Folio</th>
                      <th className="p-3 text-center w-24">Fecha</th>
                      <th className="p-3">Beneficiario / Receptor</th>
                      <th className="p-3">Cargo / Área</th>
                      <th className="p-3">Tipo de Kit</th>
                      <th className="p-3 text-center">Ítems Incluidos</th>
                      <th className="p-3">Entregado Por</th>
                      <th className="p-3 text-center w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {filteredDeliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-mono font-black text-blue-700 bg-blue-50/40">
                          #{del.folio}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-700 text-xs">
                          {del.delivery_date}
                        </td>
                        <td className="p-3 uppercase text-slate-900 font-black">
                          <div>
                            <p>{del.recipient_name}</p>
                            {del.recipient_ci && (
                              <p className="text-[10px] text-slate-400 font-mono">C.I. {del.recipient_ci}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 uppercase text-slate-700 text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{del.recipient_position}</p>
                            <p className="text-[10px] text-slate-500">{del.recipient_area}</p>
                          </div>
                        </td>
                        <td className="p-3 uppercase text-xs">
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-black">
                            {del.kit_name}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800 text-xs">
                          {del.items ? del.items.length : 0} medicamentos
                        </td>
                        <td className="p-3 uppercase text-slate-600 text-xs">
                          {del.delivered_by}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewPrint(del)}
                              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition border border-slate-300"
                              title="Imprimir Acta de Entrega"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(del.id, del.recipient_name)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                              title="Eliminar Registro"
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

      {/* VISTA 2: FORMULARIO DE ARMADO Y ENTREGA DE KIT */}
      {viewMode === 'form' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xl space-y-6">
          
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
                  Armar y Registrar Entrega de Kit de Medicamentos
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  Seleccione una plantilla base o personalice los medicamentos a entregar
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

          {/* SELECTOR DE PLANTILLAS DE KIT */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Seleccionar Plantilla de Kit Preconfigurado:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PREDEFINED_KITS.map((tpl, idx) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => handleTemplateChange(idx)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition ${
                    selectedTemplateIndex === idx 
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                  }`}
                >
                  <p className="font-black text-xs text-slate-900 uppercase">{tpl.name}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{tpl.description}</p>
                  <p className="text-[10px] text-blue-700 font-mono font-bold mt-2">
                    {tpl.defaultItems.length > 0 ? `${tpl.defaultItems.length} medicamentos base` : 'A medida'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* DATOS DEL BENEFICIARIO */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
              
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900 uppercase">
                  Nombre del Kit Asignado <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900 uppercase">
                  Nombre del Trabajador / Receptor <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="EJ. JUAN CARLOS PÉREZ..."
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900 uppercase">
                  C.I. del Beneficiario
                </label>
                <input
                  type="text"
                  placeholder="EJ. 7526197 OR..."
                  value={recipientCi}
                  onChange={(e) => setRecipientCi(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900 uppercase">
                  Cargo / Puesto <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="EJ. LINIERO DE CUADRILLA / TÉCNICO..."
                  value={recipientPosition}
                  onChange={(e) => setRecipientPosition(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900 uppercase">
                  Área / Cuadrilla / Móvil <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="EJ. CUADRILLA 3 - SUBESTACIONES / MÓVIL 14..."
                  value={recipientArea}
                  onChange={(e) => setRecipientArea(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900 uppercase">
                  Fecha de Entrega <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600"
                />
              </div>

            </div>

            {/* TABLA DE MEDICAMENTOS INCLUIDOS EN EL KIT */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex justify-between items-center">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Medicamentos e Insumos Incluidos en este Kit ({items.length})
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase">
                      <th className="p-2.5 text-center w-10">N°</th>
                      <th className="p-2.5">Medicamento / Insumo</th>
                      <th className="p-2.5 text-center w-28">Cantidad</th>
                      <th className="p-2.5 text-center w-28">Unidad</th>
                      <th className="p-2.5 text-center w-16">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-bold">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 uppercase text-slate-900 font-black">{item.name}</td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQtyChange(idx, parseInt(e.target.value) || 1)}
                            className="w-16 text-center font-mono font-black border border-slate-300 rounded-lg p-1 bg-white"
                          />
                        </td>
                        <td className="p-2.5 text-center text-slate-600">{item.unit}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Quitar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* AGREGAR MEDICAMENTO EXTRA */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1 w-full">
                  <label className="text-[11px] font-black text-slate-700 uppercase">
                    + Agregar Medicamento / Insumo Adicional:
                  </label>
                  <input
                    type="text"
                    placeholder="EJ. ANALGÉSICO, SOLUCIÓN FISIOLÓGICA, VENDA EXTRA..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs uppercase font-bold"
                  />
                </div>

                <div className="w-24 space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">Cantidad:</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-center"
                  />
                </div>

                <div className="w-32 space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase">Unidad:</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold"
                  >
                    <option value="Tabletas">Tabletas</option>
                    <option value="Sobres">Sobres</option>
                    <option value="Frasco">Frasco</option>
                    <option value="Rollos">Rollos</option>
                    <option value="Unidades">Unidades</option>
                    <option value="Paquete">Paquete</option>
                    <option value="Tubo">Tubo</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs px-4 py-2.5 rounded-xl transition"
                >
                  Agregar al Kit
                </button>
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
                    <span>Guardando Entrega...</span>
                  </>
                ) : (
                  <span>Registrar y Emitir Acta</span>
                )}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* VISTA 3: ACTA OFICIAL IMPRIMIBLE CON CLASE print-area */}
      {viewMode === 'print' && selectedPrintDelivery && (
        <div className="space-y-4">
          
          <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-2xl shadow-sm print:hidden">
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Listado</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-black shadow-lg transition"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>IMPRIMIR ACTA DE ENTREGA</span>
            </button>
          </div>

          {/* DOCUMENTO OFICIAL IMPRIMIBLE */}
          <div className="print-area bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-xl max-w-4xl mx-auto print:shadow-none print:border-none print:w-full print:p-0 font-sans">
            
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center gap-4">
                <img 
                  src="/logo-ende.png" 
                  alt="ENDE DEORURO" 
                  className="h-12 w-auto object-contain"
                />
                <div>
                  <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">ENDE DEORURO - DEPARTAMENTO DE SEGURIDAD INDUSTRIAL</h2>
                  <p className="text-xs font-extrabold text-blue-800 uppercase tracking-wide">ACTA DE ENTREGA Y DOTACIÓN DE KIT DE MEDICAMENTOS / BOTIQUÍN</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1.5 rounded uppercase">
                  FOLIO #{selectedPrintDelivery.folio}
                </span>
                <p className="text-[10px] text-slate-500 font-bold mt-1 font-mono">
                  FECHA: {selectedPrintDelivery.delivery_date}
                </p>
              </div>
            </div>

            {/* DATOS DEL RECEPTOR */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Beneficiario / Responsable:</p>
                <p className="text-sm font-black uppercase text-slate-900">{selectedPrintDelivery.recipient_name}</p>
                {selectedPrintDelivery.recipient_ci && (
                  <p className="text-[11px] text-slate-600 font-mono">C.I.: {selectedPrintDelivery.recipient_ci}</p>
                )}
              </div>

              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Cargo / Área Asignada:</p>
                <p className="text-sm font-black uppercase text-slate-900">{selectedPrintDelivery.recipient_position}</p>
                <p className="text-[11px] text-slate-600 uppercase font-bold">{selectedPrintDelivery.recipient_area}</p>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-200">
                <p className="text-slate-500 font-bold uppercase text-[10px]">Tipo de Kit Suministrado:</p>
                <p className="text-xs font-black uppercase text-blue-900">{selectedPrintDelivery.kit_name}</p>
              </div>
            </div>

            <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 mb-3 border-l-4 border-rose-600 pl-2">
              DETALLE DE MEDICAMENTOS E INSUMOS ENTREGADOS
            </h3>

            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase text-left">
                    <th className="p-2.5 text-center w-10 border border-slate-900">N°</th>
                    <th className="p-2.5 border border-slate-900">DESCRIPCIÓN DEL MEDICAMENTO / INSUMO</th>
                    <th className="p-2.5 text-center w-24 border border-slate-900 bg-blue-950">CANTIDAD</th>
                    <th className="p-2.5 text-center w-28 border border-slate-900">UNIDAD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 border border-slate-300 font-bold">
                  {selectedPrintDelivery.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono border-r border-slate-300">{idx + 1}</td>
                      <td className="p-2.5 uppercase border-r border-slate-300">{item.name}</td>
                      <td className="p-2.5 text-center font-mono font-black text-blue-950 border-r border-slate-300 bg-blue-50/40">{item.quantity}</td>
                      <td className="p-2.5 text-center border-r border-slate-300">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-600 italic text-justify leading-relaxed mb-10">
              * El trabajador o encargado receptor declara haber recibido los medicamentos e insumos de primeros auxilios detallados precedentemente en perfecto estado, comprometiéndose a su custodia y uso responsable estrictamente para la atención de urgencias laborales.
            </p>

            <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs sm:text-sm">
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">FIRMA DEL RECEPTOR</p>
                <p className="text-xs text-slate-600 font-bold uppercase">{selectedPrintDelivery.recipient_name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{selectedPrintDelivery.recipient_position}</p>
              </div>
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">RESPONSABLE DE SEGURIDAD INDUSTRIAL</p>
                <p className="text-xs text-slate-600 font-bold uppercase">{selectedPrintDelivery.delivered_by}</p>
                <p className="text-[10px] text-slate-500">ENDE DEORURO</p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
