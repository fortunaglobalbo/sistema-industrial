'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Trash2, Search, UserPlus, Check, Loader2, Edit, Trash,
  Package, ShoppingBag, HardHat, Wrench, RefreshCw, Settings, HeartPulse
} from 'lucide-react';

import { 
  getWorkers, 
  searchWorkers, 
  createWorker, 
  getInventory, 
  registerTransaction,
  WorkerData,
  updateWorker,
  deleteWorker,
  addInventoryItem,
  updateInventoryStock,
  deleteInventoryItem
} from '@/app/actions/transaction';
import PhotoUpload from './PhotoUpload';
import Swal from 'sweetalert2';

// Esquemas de validación Zod
const itemSchema = z.object({
  itemName: z.string().min(1, 'El nombre del insumo es requerido'),
  category: z.enum(['ropa', 'epp', 'herramientas', 'botiquin']),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  conditionReason: z.enum(['desgaste_natural', 'dano_operativo', 'defecto_fabrica', 'cambio_talla', 'nuevo', 'en_desuso']),
  photoUrl: z.string().nullable().optional(),
});

const formSchema = z.object({
  workerId: z.string().min(1, 'Debe seleccionar un trabajador'),
  supervisorName: z.string().min(1, 'El nombre de la supervisora/jefe es requerido'),
  transactionType: z.enum(['devolucion', 'entrega', 'intercambio', 'dotacion', 'desuso']),
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

  // Estado para EDICIÓN de trabajador seleccionado
  const [isEditingWorker, setIsEditingWorker] = useState(false);
  const [editWorkerLoading, setEditWorkerLoading] = useState(false);
  const [editWorkerError, setEditWorkerError] = useState('');
  const [editWorkerData, setEditWorkerData] = useState<WorkerData>({
    fullName: '',
    ci: '',
    position: '',
    department: '',
    supervisorName: '',
  });

  // Estados para GESTIÓN directa del inventario/almacén en la barra lateral
  const [isManagingInventory, setIsManagingInventory] = useState(false);
  const [inventoryManageTab, setInventoryManageTab] = useState<'add' | 'edit'>('add');
  const [manageItemError, setManageItemError] = useState('');
  const [manageItemSuccess, setManageItemSuccess] = useState('');
  const [manageLoading, setManageLoading] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState({
    name: '',
    category: 'epp' as 'epp' | 'ropa' | 'herramientas' | 'botiquin',
    currentStock: 0
  });
  const [selectedManageItemId, setSelectedManageItemId] = useState('');
  const [newManageStock, setNewManageStock] = useState(0);

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
      transactionType: 'dotacion',
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
    
    // Preparar datos de edición
    setEditWorkerData({
      fullName: worker.fullName,
      ci: worker.ci,
      position: worker.position,
      department: worker.department,
      supervisorName: worker.supervisorName,
    });
    setIsEditingWorker(false);
  };

  const handleDeselectWorker = () => {
    setSelectedWorker(null);
    setValue('workerId', '');
    setValue('supervisorName', '');
    setIsEditingWorker(false);
  };

  // Guardar cambios del trabajador editado
  const handleSaveEditWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker?.id) return;
    setEditWorkerError('');

    if (
      !editWorkerData.fullName.trim() ||
      !editWorkerData.ci.trim() ||
      !editWorkerData.position.trim() ||
      !editWorkerData.department.trim() ||
      !editWorkerData.supervisorName.trim()
    ) {
      setEditWorkerError('Todos los campos son requeridos para editar.');
      return;
    }

    setEditWorkerLoading(true);
    const res = await updateWorker(selectedWorker.id, editWorkerData);
    setEditWorkerLoading(false);

    if (res.success) {
      const updated = { ...selectedWorker, ...editWorkerData };
      setSelectedWorker(updated);
      setValue('supervisorName', updated.supervisorName);
      setIsEditingWorker(false);
      loadInitialData(); // Refrescar lista de autocompletado
    } else {
      setEditWorkerError(res.error || 'Error al actualizar los datos del trabajador.');
    }
  };

  // Eliminar trabajador del catálogo
  const handleDeleteWorker = () => {
    const workerId = selectedWorker?.id;
    if (!workerId) return;

    Swal.fire({
      title: '¿Eliminar trabajador?',
      text: `¿Está seguro de eliminar permanentemente a ${selectedWorker.fullName}? Se cancelarán todas sus transacciones de forma segura y se restaurará el stock de almacén.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const res = await deleteWorker(workerId);
        setLoading(false);

        if (res.success) {
          Swal.fire({
            icon: 'success',
            title: 'Trabajador Eliminado',
            text: 'El trabajador y su historial han sido eliminados del catálogo con éxito.',
            confirmButtonColor: '#10b981'
          });
          handleDeselectWorker();
          loadInitialData();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: res.error || 'No se pudo eliminar el trabajador.',
            confirmButtonColor: '#3b82f6'
          });
        }
      }
    });
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

  // Agregar nuevo insumo al catálogo de almacén
  const handleCreateInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventoryItem.name.trim()) {
      setManageItemError('El nombre del insumo es requerido.');
      return;
    }

    setManageItemError('');
    setManageItemSuccess('');
    setManageLoading(true);
    const res = await addInventoryItem(
      newInventoryItem.name,
      newInventoryItem.category as any,
      newInventoryItem.currentStock
    );
    setManageLoading(false);

    if (res.success) {
      setManageItemSuccess('¡Insumo agregado con éxito!');
      setNewInventoryItem({ name: '', category: 'epp', currentStock: 0 });
      loadInitialData(); // Actualiza el catálogo local de inmediato
    } else {
      setManageItemError(res.error || 'Error al registrar el insumo.');
    }
  };

  // Actualizar stock directamente
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManageItemId) {
      setManageItemError('Selecciona un insumo para ajustar.');
      return;
    }

    setManageItemError('');
    setManageItemSuccess('');
    setManageLoading(true);
    const res = await updateInventoryStock(selectedManageItemId, newManageStock);
    setManageLoading(false);

    if (res.success) {
      setManageItemSuccess('¡Stock actualizado con éxito!');
      loadInitialData();
    } else {
      setManageItemError(res.error || 'Error al actualizar el stock.');
    }
  };

  // Eliminar insumo del catálogo
  const handleDeleteItem = () => {
    if (!selectedManageItemId) {
      setManageItemError('Selecciona un insumo para eliminar.');
      return;
    }

    const item = inventory.find(i => i.id === selectedManageItemId);
    if (!item) return;

    Swal.fire({
      title: '¿Eliminar insumo?',
      text: `¿Está seguro de eliminar permanentemente "${item.name}" del catálogo?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setManageItemError('');
        setManageItemSuccess('');
        setManageLoading(true);
        const res = await deleteInventoryItem(selectedManageItemId);
        setManageLoading(false);

        if (res.success) {
          setManageItemSuccess('Insumo eliminado del catálogo.');
          setSelectedManageItemId('');
          setNewManageStock(0);
          loadInitialData();
        } else {
          setManageItemError(res.error || 'No se puede eliminar el insumo. Tiene transacciones registradas.');
        }
      }
    });
  };

  // Manejar selección de item en la pestaña de edición
  const handleSelectManageItem = (id: string) => {
    setSelectedManageItemId(id);
    const item = inventory.find((i) => i.id === id);
    if (item) {
      setNewManageStock(item.current_stock);
    }
  };

  // Guardar formulario de transacción principal
  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        workerId: values.workerId,
        supervisorName: values.supervisorName,
        transactionType: values.transactionType,
        signatureUrl: '',
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
        reset();
        handleDeselectWorker();
        loadInitialData();
        onSuccess(res.transactionId);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'No se pudo guardar la transacción.',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error inesperado al registrar el documento.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredCatalog = (category: string) => {
    if (category === 'epp' || category === 'botiquin') {
      return inventory.filter((item) => item.category === 'epp' || item.category === 'botiquin');
    }
    return inventory.filter((item) => item.category === category);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 py-6">
      
      {/* Formulario Principal (Columnas 1 y 2) */}
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

            {/* Formulario para registrar nuevo trabajador */}
            {showNewWorkerForm && (
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
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Supervisora / Inmediato Superior</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Ing. Patricia Arteaga"
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
            )}

            {/* Buscador de Trabajadores */}
            {!selectedWorker && !showNewWorkerForm && (
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
            )}

            {/* Ficha de Trabajador Seleccionado */}
            {selectedWorker && (
              <div className="border border-blue-200 rounded-xl overflow-hidden shadow-sm">
                {!isEditingWorker ? (
                  <div className="bg-blue-50/50 p-4 space-y-3">
                    <div className="flex justify-between items-start">
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
                          <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wide">Supervisora / Autoriza</span>
                          <span className="text-slate-800 font-semibold">{watch('supervisorName') || selectedWorker.supervisorName}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsEditingWorker(true)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteWorker}
                          className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded transition flex items-center gap-1"
                        >
                          <Trash className="w-3 h-3" /> Eliminar
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectWorker}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition"
                        >
                          Cambiar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Formulario de Edición */
                  <div className="bg-slate-50 p-4 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                        <Edit className="w-3.5 h-3.5 text-blue-500" /> Editar Ficha del Trabajador
                      </span>
                      <button 
                        type="button"
                        onClick={() => setIsEditingWorker(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        Cancelar
                      </button>
                    </div>

                    {editWorkerError && (
                      <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg">{editWorkerError}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block mb-1 uppercase">Nombre Completo</label>
                        <input
                          type="text"
                          value={editWorkerData.fullName}
                          onChange={(e) => setEditWorkerData({ ...editWorkerData, fullName: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1.5 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block mb-1 uppercase">Cédula de Identidad (C.I.)</label>
                        <input
                          type="text"
                          value={editWorkerData.ci}
                          onChange={(e) => setEditWorkerData({ ...editWorkerData, ci: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1.5 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block mb-1 uppercase">Cargo</label>
                        <input
                          type="text"
                          value={editWorkerData.position}
                          onChange={(e) => setEditWorkerData({ ...editWorkerData, position: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1.5 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block mb-1 uppercase">Área</label>
                        <input
                          type="text"
                          value={editWorkerData.department}
                          onChange={(e) => setEditWorkerData({ ...editWorkerData, department: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1.5 bg-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-600 block mb-1 uppercase">Supervisora / Inmediato Superior</label>
                        <input
                          type="text"
                          value={editWorkerData.supervisorName}
                          onChange={(e) => setEditWorkerData({ ...editWorkerData, supervisorName: e.target.value })}
                          className="w-full border rounded-lg px-2 py-1.5 bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveEditWorker}
                      disabled={editWorkerLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg transition mt-2 flex items-center justify-center gap-1"
                    >
                      {editWorkerLoading && <Loader2 className="w-3 animate-spin" />}
                      Guardar Datos de Trabajador
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {errors.workerId && (
              <p className="text-xs text-red-600 font-semibold">{errors.workerId.message}</p>
            )}

            {/* Campos confirmables (Supervisor y Tipo de Operación) */}
            {selectedWorker && !isEditingWorker && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Supervisora / Inmediato Superior</label>
                  <input
                    type="text"
                    {...register('supervisorName')}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-medium"
                    placeholder="Supervisora o jefe que autoriza"
                  />
                  {errors.supervisorName && (
                    <p className="text-xs text-red-600 font-semibold mt-1">{errors.supervisorName.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Tipo de Operación / Planilla</label>
                  <select
                    {...register('transactionType')}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-blue-50/50 border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-bold text-slate-900"
                  >
                    <option value="dotacion">Dotación (Personal Nuevo / Primer Ingreso)</option>
                    <option value="entrega">Entrega Regular (EPP / Ropa / Herramientas)</option>
                    <option value="devolucion">Devolución / Descargo</option>
                    <option value="intercambio">Intercambio (Reposición de dañado)</option>
                    <option value="desuso">Equipo en Desuso / Dado de Baja</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: DETALLE DE INSUMOS (MULTI-ÍTEM CON SOPORTE PARA DECIMALES Y BOTIQUINES) */}
          {selectedWorker && !isEditingWorker && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                  Detalle de Insumos / Equipo Entregado o Descargado
                </h3>
                <button
                  type="button"
                  onClick={() => append({ itemName: '', category: 'epp', quantity: 1, conditionReason: transactionType === 'dotacion' ? 'nuevo' : 'desgaste_natural', photoUrl: null })}
                  className="flex items-center gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Ítem
                </button>
              </div>

              {errors.items && (
                <p className="text-xs text-red-600 font-semibold">{errors.items.message}</p>
              )}

              <div className="space-y-4">
                {fields.map((field, index) => {
                  const watchCategory = watch(`items.${index}.category`);
                  const filteredCatalog = getFilteredCatalog(watchCategory);

                  return (
                    <div key={field.id} className="relative p-4 border border-slate-200 hover:border-slate-300 bg-slate-50/50 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      
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
                          className="w-full text-xs border bg-white rounded-lg px-2 py-1.5 focus:outline-none"
                        >
                          <option value="epp">EPP (Protección)</option>
                          <option value="botiquin">Botiquín / Auxilios</option>
                          <option value="ropa">Ropa de Trabajo</option>
                          <option value="herramientas">Herramientas</option>
                        </select>
                      </div>

                      {/* Nombre del Insumo */}
                      <div className="md:col-span-4">
                        <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Insumo / Descripción</label>
                        <select
                          {...register(`items.${index}.itemName`)}
                          className="w-full text-xs border bg-white rounded-lg px-2 py-1.5 focus:outline-none font-medium"
                        >
                          <option value="">-- Seleccionar --</option>
                          {filteredCatalog.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.name} ({item.current_stock} disp.)
                            </option>
                          ))}
                        </select>
                        {errors.items?.[index]?.itemName && (
                          <span className="text-[10px] text-red-500 block mt-1">{errors.items[index]?.itemName?.message}</span>
                        )}
                      </div>

                      {/* Cantidad (Soporta fracciones decimales como 22.5 o 3.5) */}
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Cantidad (pza/par)</label>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder="Ej. 22.5"
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          className="w-full text-xs border bg-white rounded-lg px-2 py-1.5 focus:outline-none font-bold"
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
                          className="w-full text-xs border bg-white rounded-lg px-2 py-1.5 focus:outline-none font-medium"
                        >
                          <option value="nuevo">Nuevo (Dotación / Ingreso)</option>
                          <option value="desgaste_natural">Desgaste Natural</option>
                          <option value="dano_operativo">Daño Operativo</option>
                          <option value="defecto_fabrica">Defecto de Fábrica</option>
                          <option value="cambio_talla">Cambio de Talla</option>
                          <option value="en_desuso">En Desuso / Dado de Baja</option>
                        </select>
                      </div>

                      {/* Foto de respaldo */}
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
          {selectedWorker && !isEditingWorker && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                Confirmar Registro de Acta
              </h3>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando acta y ajustando inventario...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Registrar y Generar Acta Imprimible (Carta)
                  </>
                )}
              </button>
            </div>
          )}

        </form>
      </div>

      {/* PANEL LATERAL: CATÁLOGO / GESTIÓN DE ALMACÉN */}
      <div className="space-y-6">
        
        {/* Card de Stock de Almacén y Ajustes Directos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Stock de Almacén
            </h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsManagingInventory(!isManagingInventory);
                  setManageItemError('');
                  setManageItemSuccess('');
                }}
                className={`p-1.5 rounded-lg border transition ${isManagingInventory ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600 border-slate-200'}`}
                title="Gestionar Catálogo de Almacén"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={loadInitialData}
                className="text-slate-400 hover:text-slate-600 transition"
                title="Recargar inventario"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* MODO GESTIÓN ACTIVO */}
          {isManagingInventory ? (
            <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center border-b pb-2 mb-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Gestión de Catálogo</span>
                <button
                  onClick={() => setIsManagingInventory(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>

              {/* Pestañas de Gestión */}
              <div className="flex gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setInventoryManageTab('add');
                    setManageItemError('');
                    setManageItemSuccess('');
                  }}
                  className={`flex-1 text-[10px] py-1 rounded font-bold transition ${inventoryManageTab === 'add' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Agregar Insumo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInventoryManageTab('edit');
                    setManageItemError('');
                    setManageItemSuccess('');
                  }}
                  className={`flex-1 text-[10px] py-1 rounded font-bold transition ${inventoryManageTab === 'edit' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Ajustar / Eliminar
                </button>
              </div>

              {/* Mensajes de Estado */}
              {manageItemError && (
                <p className="text-[10px] text-red-600 font-bold bg-red-50 p-1.5 rounded">{manageItemError}</p>
              )}
              {manageItemSuccess && (
                <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 p-1.5 rounded">{manageItemSuccess}</p>
              )}

              {/* PESTAÑA AGREGAR INSUMO */}
              {inventoryManageTab === 'add' ? (
                <form onSubmit={handleCreateInventoryItem} className="space-y-2 text-[10px]">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Nombre del Insumo</label>
                    <input
                      type="text"
                      placeholder="Ej. Botiquín de Primeros Auxilios"
                      value={newInventoryItem.name}
                      onChange={(e) => setNewInventoryItem({ ...newInventoryItem, name: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Categoría</label>
                    <select
                      value={newInventoryItem.category}
                      onChange={(e: any) => setNewInventoryItem({ ...newInventoryItem, category: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="epp">EPP (Protección)</option>
                      <option value="botiquin">Botiquín / Auxilios</option>
                      <option value="ropa">Ropa de Trabajo</option>
                      <option value="herramientas">Herramientas</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Stock Inicial</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={newInventoryItem.currentStock}
                      onChange={(e) => setNewInventoryItem({ ...newInventoryItem, currentStock: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded px-2 py-1 text-xs bg-white font-bold"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={manageLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded mt-2 transition flex items-center justify-center"
                  >
                    {manageLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Agregar al Catálogo'}
                  </button>
                </form>
              ) : (
                /* PESTAÑA AJUSTAR / ELIMINAR */
                <form onSubmit={handleUpdateStock} className="space-y-2 text-[10px]">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Seleccionar Insumo</label>
                    <select
                      value={selectedManageItemId}
                      onChange={(e) => handleSelectManageItem(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="">-- Seleccionar --</option>
                      {inventory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.current_stock} u)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedManageItemId && (
                    <>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Nuevo Stock</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={newManageStock}
                          onChange={(e) => setNewManageStock(parseFloat(e.target.value) || 0)}
                          className="w-full border rounded px-2 py-1 text-xs bg-white font-bold"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={manageLoading}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded transition flex items-center justify-center"
                        >
                          {manageLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Actualizar Stock'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteItem}
                          disabled={manageLoading}
                          className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded transition flex items-center justify-center"
                          title="Eliminar del catálogo"
                        >
                          {manageLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>
          ) : (
            /* LISTA DE STOCK NORMAL */
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {['epp', 'botiquin', 'ropa', 'herramientas'].map((cat) => {
                const itemsInCat = inventory.filter((i) => i.category === cat);
                return (
                  <div key={cat} className="space-y-1.5">
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      {cat === 'epp' && <HardHat className="w-3.5 h-3.5" />}
                      {cat === 'botiquin' && <HeartPulse className="w-3.5 h-3.5 text-rose-500" />}
                      {cat === 'ropa' && <ShoppingBag className="w-3.5 h-3.5" />}
                      {cat === 'herramientas' && <Wrench className="w-3.5 h-3.5" />}
                      {cat === 'epp' ? 'EPP (Protección)' : cat === 'botiquin' ? 'Botiquines / Primeros Auxilios' : cat === 'ropa' ? 'Ropa de Trabajo' : 'Herramientas'}
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
          )}
        </div>
      </div>

    </div>
  );
}
