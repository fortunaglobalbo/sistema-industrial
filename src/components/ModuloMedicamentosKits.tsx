'use client';

import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, Plus, RefreshCw, Printer, Trash2, Edit2, 
  Search, ArrowLeft, Package, Sparkles, CheckCircle2, 
  Info, ShieldCheck
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  saveMedicineKit, 
  getMedicineKits, 
  deleteMedicineKit 
} from '@/app/actions/medicineKit';
import { 
  MedicineItem, 
  MedicineKitInput, 
  MedicineKitData, 
  PREDEFINED_KITS 
} from '@/lib/medicineKitTypes';

interface ModuloMedicamentosKitsProps {
  showTabs?: boolean;
}

export default function ModuloMedicamentosKits({ showTabs = true }: ModuloMedicamentosKitsProps) {
  const [kits, setKits] = useState<MedicineKitData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Vistas: 'list' | 'form' | 'print'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'print'>('list');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kitName, setKitName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<MedicineItem[]>([]);

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
    const list = await getMedicineKits();
    setKits(list);
    setLoading(false);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setKitName('');
    setDescription('');
    setItems([...PREDEFINED_KITS[0].items]);
    setViewMode('form');
  };

  const handleEdit = (kit: MedicineKitData) => {
    setEditingId(kit.id);
    setKitName(kit.name);
    setDescription(kit.description || '');
    setItems([...kit.items]);
    setViewMode('form');
  };

  const handleLoadTemplate = (tpl: MedicineKitInput) => {
    setKitName(tpl.name);
    setDescription(tpl.description || '');
    setItems([...tpl.items]);
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
    if (!kitName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nombre Obligatorio', text: 'Especifique el nombre del kit (ej. Kit Básico).' });
      return;
    }
    if (items.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Kit Vacío', text: 'Debe incluir al menos un medicamento o insumo.' });
      return;
    }

    setIsSubmitting(true);
    const payload: MedicineKitInput = {
      name: kitName,
      description,
      items
    };

    const res = await saveMedicineKit(payload, editingId || undefined);
    setIsSubmitting(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: editingId ? 'Kit Actualizado' : 'Kit Creado',
        text: `El ${kitName.toUpperCase()} fue guardado y estará disponible al registrar Actas.`,
        timer: 2000,
        showConfirmButton: false
      });
      loadData();
      setViewMode('list');
    } else {
      Swal.fire({ icon: 'error', title: 'Error al Guardar', text: res.error });
    }
  };

  const handleDelete = async (id: string, name: string) => {
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
        loadData();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  const filteredKits = kits.filter((k) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      k.name.toLowerCase().includes(term) ||
      (k.description && k.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* VISTA 1: LISTADO DE KITS ARMADOS */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          
          {/* BANNER INFORMATIVO */}
          <div className="bg-gradient-to-r from-rose-50 to-blue-50 border border-rose-200 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-rose-600 text-white rounded-2xl shadow">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  Gestión y Armado de Kits de Medicamentos / Botiquines
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Los kits creados aquí se cargan automáticamente en el <strong>Formulario de Registro de Actas</strong> para entregas rápidas a trabajadores y cuadrillas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('print')}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Catálogo</span>
              </button>

              <button
                onClick={handleOpenNew}
                className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-3 rounded-xl transition shadow-lg"
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-600"
              />
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* TARJETAS DE KITS CONFIGURADOS */}
          {loading ? (
            <div className="text-center py-12 text-xs font-bold text-slate-500">Cargando kits...</div>
          ) : filteredKits.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-2xl">
              No se encontraron kits registrados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredKits.map((kit) => (
                <div key={kit.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4">
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
                        <Package className="w-5 h-5" />
                      </span>
                      <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        {kit.items ? kit.items.length : 0} medicamentos
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{kit.name}</h4>
                    {kit.description && (
                      <p className="text-xs text-slate-500 leading-snug">{kit.description}</p>
                    )}

                    <div className="pt-3 border-t border-slate-100 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contenido del Kit:</p>
                      {kit.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-0.5 border-b border-dashed border-slate-100">
                          <span className="text-slate-700 font-bold uppercase truncate max-w-[180px]">{it.name}</span>
                          <span className="font-mono font-black text-slate-900 shrink-0">{it.quantity} {it.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(kit)}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-3 py-1.5 rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(kit.id, kit.name)}
                      className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs px-3 py-1.5 rounded-lg transition border border-red-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* VISTA 2: FORMULARIO DE CREACIÓN / EDICIÓN DE KIT */}
      {viewMode === 'form' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-xl space-y-6">
          
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
                  {editingId ? `Editar Kit: ${kitName}` : 'Armar Nuevo Kit de Medicamentos'}
                </h2>
                <p className="text-xs text-slate-500 font-bold">
                  Defina el nombre y configure la lista de medicamentos con sus cantidades
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

          {/* CARGAR PLANTILLA RÁPIDA */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Cargar Base desde Plantilla Predefinida (Opcional):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PREDEFINED_KITS.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => handleLoadTemplate(tpl)}
                  className="p-3 rounded-xl border border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 text-left transition bg-slate-50/50"
                >
                  <p className="font-black text-xs text-slate-900 uppercase">{tpl.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{tpl.description}</p>
                  <p className="text-[10px] text-blue-700 font-mono font-bold mt-1">
                    {tpl.items.length} medicamentos base
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Nombre del Kit <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="EJ. KIT BÁSICO, KIT CUADRILLA TÉCNICA..."
                value={kitName}
                onChange={(e) => setKitName(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-black uppercase rounded-xl px-4 py-2.5 focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-900 uppercase">
                Descripción / Destino
              </label>
              <input
                type="text"
                placeholder="EJ. PARA CUADRILLAS DE LÍNEAS Y SUBESTACIONES..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:bg-white text-slate-900 text-sm font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-rose-600"
              />
            </div>

          </div>

          {/* TABLA DE MEDICAMENTOS DEL KIT */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex justify-between items-center">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Medicamentos e Insumos en este Kit ({items.length})
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
                  + Agregar Medicamento / Insumo al Kit:
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
                Agregar
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
              className="bg-rose-600 hover:bg-rose-700 text-white font-black px-7 py-3 rounded-xl transition shadow-lg text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando Kit...</span>
                </>
              ) : (
                <span>Guardar y Habilitar Kit</span>
              )}
            </button>
          </div>

        </form>
      )}

      {/* VISTA 3: PLANILLA DE CATÁLOGO IMPRIMIBLE CON CLASE print-area */}
      {viewMode === 'print' && (
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
              <span>IMPRIMIR CATÁLOGO DE KITS</span>
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
                  <p className="text-xs font-extrabold text-blue-800 uppercase tracking-wide">CATÁLOGO OFICIAL DE KITS DE MEDICAMENTOS Y BOTIQUINES</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1.5 rounded uppercase">
                  ESTÁNDAR DE DOTACIÓN
                </span>
                <p className="text-[10px] text-slate-500 font-bold mt-1 font-mono">
                  EMISIÓN: {new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              {kits.map((kit, idx) => (
                <div key={kit.id} className="border border-slate-300 rounded-xl p-4">
                  <div className="flex justify-between items-center border-b pb-2 mb-3">
                    <h3 className="font-black text-sm uppercase text-slate-900">
                      {idx + 1}. {kit.name}
                    </h3>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {kit.items?.length || 0} medicamentos
                    </span>
                  </div>

                  {kit.description && (
                    <p className="text-xs text-slate-600 mb-3 italic">{kit.description}</p>
                  )}

                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-black uppercase text-left border-b border-slate-300">
                        <th className="p-1.5 w-8 text-center">N°</th>
                        <th className="p-1.5">Medicamento / Insumo</th>
                        <th className="p-1.5 text-center w-24">Cantidad</th>
                        <th className="p-1.5 text-center w-28">Unidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {kit.items?.map((it, i) => (
                        <tr key={i}>
                          <td className="p-1.5 text-center font-mono text-slate-400">{i + 1}</td>
                          <td className="p-1.5 uppercase font-bold">{it.name}</td>
                          <td className="p-1.5 text-center font-mono font-black">{it.quantity}</td>
                          <td className="p-1.5 text-center text-slate-600">{it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs sm:text-sm">
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">RESPONSABLE DE SEGURIDAD INDUSTRIAL</p>
                <p className="text-xs text-slate-600 font-bold uppercase">ENDE DEORURO</p>
              </div>
              <div>
                <div className="border-b-2 border-slate-400 w-3/4 mx-auto mb-2"></div>
                <p className="font-black text-slate-900 uppercase">SUPERVISIÓN MÉDICA / SALUD OCUPACIONAL</p>
                <p className="text-xs text-slate-600 font-bold uppercase">ENDE DEORURO</p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
