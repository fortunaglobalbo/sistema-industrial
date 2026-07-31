'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Trash2, Search, UserPlus, Check, Loader2, 
  Package, FileText, ShoppingBag, HardHat, Wrench, RefreshCw
} from 'lucide-react';

import { 
  getWorkers, 
  searchWorkers, 
  createWorker, 
  getInventory, 
  registerTransaction,
  WorkerData,
  TransactionItemData
} from '@/app/actions/transaction';
import { supabase } from '@/lib/supabase';
import PhotoUpload from './PhotoUpload';

// Esquemas de validación Zod
const itemSchema = z.object({
  itemName: z.string().min(1, 'El nombre del insumo es requerido'),
  category: z.enum(['ropa', 'epp', 'herramientas']),
  quantity: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  conditionReason: z.enum(['desgaste_natural', 'dano_operativo', 'defecto_fabrica', 'cambio_talla', 'nuevo']),
  photoUrl: z.string().nullable().optional(),
});

const formSchema = z.object({
  workerId: z.string().min(1, 'Debe seleccionar un trabajador'),
  supervisorName: z.string().min(1, 'El nombre del supervisor/jefe es requerido'),
  transactionType: z.enum(['devolucion', 'entrega', 'intercambio']),
  signatureUrl: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1, 'Debe agregar al menos un insumo a la transacción'),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onSuccess: (transactionId: string) => void;
}

export default function TransactionForm({ onSuccess }: TransactionFormProps) {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null);
  
  // Estado para creación rápida de trabajador
  const [showNewWorkerForm, setShowNewWorkerForm] = useState(false);
  const [newWorkerLoading, setNewWorkerLoading] = useState(false);
  const [newWorkerError, setNewWorkerError] = useState('');
  const [newWorkerData, setNewWorkerData] = useState({
    fullName: '',
    ci: '',
    position: '',
    department: '',
    supervisorName: '',
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workerId: '',
      supervisorName: '',
      transactionType: 'entrega',
      signatureUrl: '',
      items: [{ itemName: '', category: 'epp', quantity: 1, conditionReason: 'nuevo', photoUrl: null }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const transactionType = watch('transactionType');

  // Cargar lista inicial de trabajadores y catálogo de inventario
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const wData = await getWorkers();
    setWorkers(wData);
    const iData = await getInventory();
    setInventory(iData);
  };

  // Buscar trabajador por C.I. o Nombre
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    const results = await searchWorkers(searchQuery);
    setWorkers(results);
    setSearching(false);
  };

  const handleSelectWorker = (worker: WorkerData) => {
    setSelectedWorker(worker);
    setValue('workerId', worker.id || '');
    setValue('supervisorName', worker.supervisorName);
    setSearchQuery('');
  };

  const handleDeselectWorker = () => {
    setSelectedWorker(null);
    setValue('workerId', '');
    setValue('supervisorName', '');
  };

  // Registrar nuevo trabajador rápidamente
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewWorkerError('');

    if (
      !newWorkerData.fullName.trim() ||
      !newWorkerData.ci.trim() ||
      !newWorkerData.position.trim() ||
      !newWorkerData.department.trim() ||
      !newWorkerData.supervisorName.trim()
    ) {
      setNewWorkerError('Todos los campos son obligatorios.');
      return;
    }

    setNewWorkerLoading(true);
    const res = await createWorker(newWorkerData);
    setNewWorkerLoading(false);

    if (res.success && res.worker) {
      // Agregar al listado local y seleccionar automáticamente
      setWorkers((prev) => [res.worker!, ...prev]);
      handleSelectWorker(res.worker);
      setShowNewWorkerForm(false);
      setNewWorkerData({
        fullName: '',
        ci: '',
        position: '',
        department: '',
        supervisorName: '',
      });
    } else {
      setNewWorkerError(res.error || 'Error al guardar el trabajador.');
    }
  };

  // Subir la firma a Supabase Storage y retornar su URL pública
  const uploadSignature = async (base64Data: string): Promise<string> => {
    const res = await fetch(base64Data);
    const blob = await res.blob();
    const fileName = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    const { data, error } = await supabase.storage
      .from('signatures')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('signatures')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // Guardar formulario principal
  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      // 1. Subir firma digital primero si está en base64
      let finalSignatureUrl = '';
      if (values.signatureUrl && values.signatureUrl.startsWith('data:image')) {
        finalSignatureUrl = await uploadSignature(values.signatureUrl);
      }

      // 2. Registrar transacción
      const payload = {
        workerId: values.workerId,
        supervisorName: values.supervisorName,
        transactionType: values.transactionType,
        signatureUrl: finalSignatureUrl,
        items: values.items.map((item) => ({
          itemName: item.itemName,
          category: item.category,
          quantity: item.quantity,
          conditionReason: item.conditionReason,
          photoUrl: item.photoUrl,
        })),
      };

      const res = await registerTransaction(payload);
      if (res.success && res.transactionId) {
        // Reiniciar formulario y redirigir
        reset();
        handleDeselectWorker();
        loadInitialData(); // Recargar inventario actualizado
        onSuccess(res.transactionId);
      } else {
        alert(res.error || 'Error al guardar la transacción.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Ocurrió un error inesperado al registrar el acta de descargo.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar catálogo de inventario por categoría seleccionada
  const getFilteredCatalog = (category: string) => {
    return inventory.filter((item) => item.category === category);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 py-6">
      
      {/* Formulario Principal - Columnas 1 y 2 en Desktop */}
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* SECCIÓN 1: DATOS DEL TRABAJADOR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                Datos del Trabajador
              </h3>
              {!selectedWorker && !showNewWorkerForm && (
                <button
                  type="button"
                  onClick={() => setShowNewWorkerForm(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Nuevo Trabajador
                </button>
              )}
            </div>

            {/* Formulario de creación rápida de trabajador (Modal/Inline) */}
            {showNewWorkerForm ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b pb-2 mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Registrar Nuevo Trabajador</h4>
                  <button 
                    type="button" 
                    onClick={() => setShowNewWorkerForm(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
                
                {newWorkerError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg font-medium">{newWorkerError}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Nombre Completo</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Carlos Mendez Valdivia"
                      value={newWorkerData.fullName}
                      onChange={(e) => setNewWorkerData({...newWorkerData, fullName: e.target.value})}
                      className="w-full text-sm border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Cédula de Identidad (C.I.)</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 1029384"
                      value={newWorkerData.ci}
                      onChange={(e) => setNewWorkerData({...newWorkerData, ci: e.target.value})}
                      className="w-full text-sm border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Cargo / Puesto</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Operador de Montacargas"
                      value={newWorkerData.position}
                      onChange={(e) => setNewWorkerData({...newWorkerData, position: e.target.value})}
                      className="w-full text-sm border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Área / Departamento</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Almacén / Logística"
                      value={newWorkerData.department}
                      onChange={(e) => setNewWorkerData({...newWorkerData, department: e.target.value})}
                      className="w-full text-sm border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Inmediato Superior (Jefe Directo)</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Ing. Roberto Choque"
                      value={newWorkerData.supervisorName}
                      onChange={(e) => setNewWorkerData({...newWorkerData, supervisorName: e.target.value})}
                      className="w-full text-sm border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateWorker}
                  disabled={newWorkerLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg transition mt-2 flex items-center justify-center gap-1.5"
                >
                  {newWorkerLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Registrar y Seleccionar Trabajador
                </button>
              </div>
            ) : null}

            {/* Buscador de Trabajadores (Si no hay seleccionado) */}
            {!selectedWorker && !showNewWorkerForm ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por Nombre o C.I. del trabajador..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-sm border rounded-lg pl-9 pr-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                  >
                    {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                  </button>
                </div>

                {/* Resultados de búsqueda rápidos */}
                {workers.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {workers.map((w) => (
                      <div 
                        key={w.id} 
                        onClick={() => handleSelectWorker(w)}
                        className="flex justify-between items-center p-2.5 text-xs hover:bg-slate-50 cursor-pointer transition"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{w.fullName}</p>
                          <p className="text-[10px] text-slate-500">{w.position} • {w.department}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold text-[10px]">C.I. {w.ci}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Trabajador Seleccionado */}
            {selectedWorker ? (
              <div className="flex justify-between items-start bg-blue-50/50 p-4 border border-blue-200 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wide">Trabajador</span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedWorker.fullName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wide">C.I.</span>
                    <span className="font-bold text-slate-800 text-sm font-mono">{selectedWorker.ci}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wide">Cargo / Área</span>
                    <span className="text-slate-800">{selectedWorker.position} ({selectedWorker.department})</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wide">Autoriza (Jefe Directo)</span>
                    <span className="text-slate-800 font-semibold">{watch('supervisorName') || selectedWorker.supervisorName}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeselectWorker}
                  className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              !showNewWorkerForm && (
                <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  Busca y selecciona un trabajador o crea uno nuevo para comenzar.
                </div>
              )
            )}
            
            {errors.workerId && (
              <p className="text-xs text-red-600 font-semibold">{errors.workerId.message}</p>
            )}

            {/* Input Editable de Supervisor/Inmediato Superior */}
            {selectedWorker && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Inmediato Superior Responsable</label>
                  <input
                    type="text"
                    {...register('supervisorName')}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="Jefe de área que autoriza"
                  />
                  {errors.supervisorName && (
                    <p className="text-xs text-red-600 font-semibold mt-1">{errors.supervisorName.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Tipo de Transacción</label>
                  <select
                    {...register('transactionType')}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  >
                    <option value="entrega">Entrega (EPP / Ropa / Herramientas)</option>
                    <option value="devolucion">Devolución / Descargo</option>
                    <option value="intercambio">Intercambio (Reposición de dañado)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: DETALLE DE INSUMOS (MULTI-ÍTEM) */}
          {selectedWorker && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                  Detalle de Insumos / Lote
                </h3>
                <button
                  type="button"
                  onClick={() => append({ itemName: '', category: 'epp', quantity: 1, conditionReason: 'nuevo', photoUrl: null })}
                  className="flex items-center gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Ítem
                </button>
              </div>

              {errors.items && (
                <p className="text-xs text-red-600 font-semibold">{errors.items.message}</p>
              )}

              {/* Lista dinámica de ítems */}
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const watchCategory = watch(`items.${index}.category`);
                  const filteredCatalog = getFilteredCatalog(watchCategory);

                  return (
                    <div key={field.id} className="relative p-4 border border-slate-200 hover:border-slate-300 bg-slate-50/50 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      {/* Botón eliminar fila */}
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="absolute -top-2.5 -right-2.5 md:-top-2 md:-right-2 bg-red-100 hover:bg-red-200 text-red-600 p-1.5 rounded-lg border border-red-200 transition"
                          title="Eliminar este ítem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Categoría */}
                      <div className="md:col-span-3">
                        <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Categoría</label>
                        <select
                          {...register(`items.${index}.category`)}
                          className="w-full text-xs border bg-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="epp">EPP</option>
                          <option value="ropa">Ropa de Trabajo</option>
                          <option value="herramientas">Herramientas</option>
                        </select>
                      </div>

                      {/* Nombre del Insumo */}
                      <div className="md:col-span-4">
                        <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Insumo / Descripción</label>
                        <select
                          {...register(`items.${index}.itemName`)}
                          className="w-full text-xs border bg-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- Seleccionar --</option>
                          {filteredCatalog.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.name} ({item.current_stock} disp.)
                            </option>
                          ))}
                          <option value="custom">-- Otro (Escribir nombre) --</option>
                        </select>
                        
                        {/* Input de texto adicional si selecciona "Otro" */}
                        {watch(`items.${index}.itemName`) === 'custom' && (
                          <input
                            type="text"
                            placeholder="Nombre del nuevo insumo..."
                            onChange={(e) => setValue(`items.${index}.itemName`, e.target.value)}
                            className="w-full text-xs border rounded-lg px-2 py-1.5 mt-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                        {errors.items?.[index]?.itemName && (
                          <span className="text-[10px] text-red-500 block mt-1">{errors.items[index]?.itemName?.message}</span>
                        )}
                      </div>

                      {/* Cantidad */}
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          className="w-full text-xs border bg-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                        />
                        {errors.items?.[index]?.quantity && (
                          <span className="text-[10px] text-red-500 block mt-1">{errors.items[index]?.quantity?.message}</span>
                        )}
                      </div>

                      {/* Estado / Motivo */}
                      <div className="md:col-span-3">
                        <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Estado / Motivo</label>
                        <select
                          {...register(`items.${index}.conditionReason`)}
                          className="w-full text-xs border bg-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {transactionType === 'entrega' ? (
                            <>
                              <option value="nuevo">Nuevo</option>
                              <option value="cambio_talla">Reposición Talla</option>
                            </>
                          ) : (
                            <>
                              <option value="desgaste_natural">Desgaste Natural</option>
                              <option value="dano_operativo">Daño Operativo</option>
                              <option value="defecto_fabrica">Defecto de Fábrica</option>
                              <option value="cambio_talla">Cambio de Talla</option>
                              <option value="nuevo">Devolución Nuevo</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Subida de foto (Mobile-friendly evidences) */}
                      <div className="col-span-full flex items-center justify-between border-t border-slate-100 pt-3 mt-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <span>¿Foto de respaldo para este ítem?</span>
                        </div>
                        <Controller
                          control={control}
                          name={`items.${index}.photoUrl`}
                          render={({ field }) => (
                            <PhotoUpload
                              value={field.value || null}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: CONFIRMAR REGISTRO */}
          {selectedWorker && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                Confirmar Registro
              </h3>

              {/* Botón de envío */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando descargo...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Registrar y Generar Acta Imprimible
                  </>
                )}
              </button>
            </div>
          )}

        </form>
      </div>

      {/* Panel Lateral - Catálogo de Inventario (Columna 3 en Desktop) */}
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Stock de Almacén
            </h3>
            <button
              onClick={loadInitialData}
              className="text-slate-400 hover:text-slate-600 transition"
              title="Recargar inventario"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Listado agrupado de Stock */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {['epp', 'ropa', 'herramientas'].map((cat) => {
              const itemsInCat = inventory.filter((i) => i.category === cat);
              return (
                <div key={cat} className="space-y-1.5">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    {cat === 'epp' && <HardHat className="w-3.5 h-3.5" />}
                    {cat === 'ropa' && <ShoppingBag className="w-3.5 h-3.5" />}
                    {cat === 'herramientas' && <Wrench className="w-3.5 h-3.5" />}
                    {cat === 'epp' ? 'EPP (Protección)' : cat === 'ropa' ? 'Ropa de Trabajo' : 'Herramientas'}
                  </h4>

                  {itemsInCat.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic pl-4">No hay insumos registrados.</p>
                  ) : (
                    <div className="space-y-1 pl-2">
                      {itemsInCat.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-slate-50 border border-slate-100">
                          <span className="font-semibold text-slate-700 truncate max-w-[150px]">{item.name}</span>
                          <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${item.current_stock > 10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : item.current_stock > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {item.current_stock} u
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
