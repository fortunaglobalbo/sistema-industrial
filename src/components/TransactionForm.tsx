'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, Trash2, Search, UserPlus, Check, Loader2, Edit, Trash,
  Package, ShoppingBag, HardHat, Wrench, RefreshCw, Settings, HeartPulse, Tag, Layers, Sparkles,
  Eye, Filter, ChevronRight
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
  deleteInventoryItem, 
  getCategories, 
  addCategory, 
  deleteCategory, 
  CategoryData 
} from '@/app/actions/transaction';
import { getMedicineKits } from '@/app/actions/medicineKit';
import { MedicineKitData } from '@/lib/medicineKitTypes';
import PhotoUpload from './PhotoUpload';
import Swal from 'sweetalert2';

// Esquemas de validación Zod
const itemSchema = z.object({
  itemName: z.string().min(1, 'El nombre del insumo es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
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
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [availableKits, setAvailableKits] = useState<MedicineKitData[]>([]);
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

  // Estados para GESTIÓN y visualización directa del inventario/almacén y Categorías
  const [inventoryManageTab, setInventoryManageTab] = useState<'view' | 'add' | 'edit' | 'categories'>('view');
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [manageItemError, setManageItemError] = useState('');
  const [manageItemSuccess, setManageItemSuccess] = useState('');
  const [manageLoading, setManageLoading] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState({
    name: '',
    category: '',
    currentStock: 0
  });
  const [selectedManageItemId, setSelectedManageItemId] = useState('');
  const [newManageStock, setNewManageStock] = useState(0);

  // Estado para nueva categoría
  const [newCategoryName, setNewCategoryName] = useState('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
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
      items: [{ itemName: '', category: 'EPP (Protección)', quantity: 1, conditionReason: 'nuevo', photoUrl: null }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const transactionType = watch('transactionType');

  // Cargar lista inicial de trabajadores, inventario y categorías
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [wData, iData, cData, kData] = await Promise.all([
        getWorkers(),
        getInventory(),
        getCategories(),
        getMedicineKits()
      ]);
      setWorkers(Array.isArray(wData) ? wData : []);
      setInventory(Array.isArray(iData) ? iData : []);
      setCategories(Array.isArray(cData) ? cData : []);
      setAvailableKits(Array.isArray(kData) ? kData : []);
      if (cData && cData.length > 0 && !newInventoryItem.category) {
        setNewInventoryItem((prev) => ({ ...prev, category: cData[0].name }));
      }
    } catch (err) {
      console.error('Error al cargar datos iniciales de dotación:', err);
    }
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
      loadInitialData();
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

  // Desglosar medicamentos de un kit en ítems individuales en el formulario
  const handleInsertKitItems = (kit: MedicineKitData) => {
    if (!kit.items || kit.items.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Kit Vacío', text: 'El kit seleccionado no contiene medicamentos.' });
      return;
    }

    const currentValues = getValues('items');
    // Si la lista tiene solo un ítem y está vacío, eliminarlo para reemplazarlo
    if (currentValues.length === 1 && !currentValues[0].itemName) {
      remove(0);
    }

    kit.items.forEach((it) => {
      append({
        itemName: it.name,
        category: 'Botiquines / Primeros Auxilios',
        quantity: it.quantity,
        conditionReason: (getValues('transactionType') === 'dotacion' ? 'nuevo' : 'desgaste_natural') as any,
        photoUrl: null
      });
    });

    Swal.fire({
      icon: 'success',
      title: 'Kit Desglosado con Éxito',
      text: `Se agregaron los ${kit.items.length} medicamentos del "${kit.name}". Puedes ajustar cantidades o eliminar cualquier medicamento individual si hubo alguna equivocación.`,
      timer: 3000,
      showConfirmButton: false
    });
  };

  // Desglosar un kit seleccionado en una fila específica
  const handleUnpackKit = (kitName: string, rowIndex: number) => {
    const cleanName = kitName.replace(/^Kit:\s*/i, '').trim().toLowerCase();
    const kit = availableKits.find(
      (k) => k.name.toLowerCase() === cleanName || k.name.toLowerCase() === kitName.toLowerCase()
    );

    if (!kit || !kit.items || kit.items.length === 0) {
      Swal.fire({ icon: 'info', title: 'Kit no encontrado', text: 'No se encontraron los medicamentos asociados a este kit.' });
      return;
    }

    remove(rowIndex);

    kit.items.forEach((it) => {
      append({
        itemName: it.name,
        category: 'Botiquines / Primeros Auxilios',
        quantity: it.quantity,
        conditionReason: (getValues('transactionType') === 'dotacion' ? 'nuevo' : 'desgaste_natural') as any,
        photoUrl: null
      });
    });

    Swal.fire({
      icon: 'info',
      title: 'Kit Desglosado',
      text: `Se desglosaron los ${kit.items.length} medicamentos en filas independientes. Ahora puedes eliminar o corregir medicamentos específicos con su botón de papelera.`,
      timer: 2500,
      showConfirmButton: false
    });
  };

  // Agregar nuevo insumo al catálogo de almacén
  const handleCreateInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventoryItem.name.trim()) {
      setManageItemError('El nombre del insumo es requerido.');
      return;
    }
    const catName = newInventoryItem.category || (categories[0] ? categories[0].name : 'EPP (Protección)');

    setManageItemError('');
    setManageItemSuccess('');
    setManageLoading(true);
    const res = await addInventoryItem(
      newInventoryItem.name,
      catName,
      newInventoryItem.currentStock
    );
    setManageLoading(false);

    if (res.success) {
      setManageItemSuccess('¡Insumo agregado con éxito!');
      setNewInventoryItem({ name: '', category: catName, currentStock: 0 });
      loadInitialData();
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

  // Agregar nueva categoría personalizada
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setManageItemError('Ingresa un nombre para la nueva categoría.');
      return;
    }

    setManageItemError('');
    setManageItemSuccess('');
    setManageLoading(true);
    const res = await addCategory(newCategoryName);
    setManageLoading(false);

    if (res.success) {
      setManageItemSuccess(`¡Categoría "${newCategoryName.trim()}" agregada con éxito!`);
      setNewCategoryName('');
      loadInitialData();
    } else {
      setManageItemError(res.error || 'No se pudo agregar la categoría.');
    }
  };

  // Eliminar una categoría
  const handleDeleteCategory = (catName: string) => {
    Swal.fire({
      title: '¿Eliminar categoría?',
      text: `¿Deseas eliminar la categoría "${catName}"? Solo podrás hacerlo si no tiene insumos asociados.`,
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
        const res = await deleteCategory(catName);
        setManageLoading(false);

        if (res.success) {
          setManageItemSuccess(`Categoría "${catName}" eliminada.`);
          loadInitialData();
        } else {
          setManageItemError(res.error || 'No se pudo eliminar la categoría.');
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

  const getFilteredCatalog = (categoryName: string) => {
    if (!categoryName) return inventory;
    const targetCat = categoryName.toLowerCase().trim();

    const baseMatches = inventory.filter((item) => {
      const itemCat = (item.category || '').toLowerCase().trim();
      return itemCat === targetCat || itemCat.includes(targetCat) || targetCat.includes(itemCat);
    });

    // Si la categoría es Botiquín, mostrar los kits armados en la lista de insumos
    if (targetCat.includes('botiqu')) {
      const kitItems = availableKits.map((k) => ({
        id: `kit-${k.id}`,
        name: k.name,
        category: categoryName,
        current_stock: 'Kit',
      }));
      return [...kitItems, ...baseMatches];
    }

    return baseMatches;
  };

  // Función de coincidencia inteligente de categorías (soporta 'epp' como 'EPP (Protección)')
  const matchesCategory = (itemCategory: string, filterCategory: string) => {
    if (!filterCategory || filterCategory === 'all') return true;
    const i = (itemCategory || '').toLowerCase().trim();
    const f = filterCategory.toLowerCase().trim();
    if (i === f) return true;
    if (f.includes('epp') && i.includes('epp')) return true;
    if ((f.includes('ropa') || f.includes('indumentaria')) && (i.includes('ropa') || i.includes('indumentaria'))) return true;
    if (f.includes('herramienta') && i.includes('herramienta')) return true;
    if ((f.includes('botiqu') || f.includes('medicamento') || f.includes('auxilio')) && 
        (i.includes('botiqu') || i.includes('medicamento') || i.includes('auxilio'))) return true;
    return i.includes(f) || f.includes(i);
  };

  // Obtener lista consolidada de categorías únicas para mostrar en filtros
  const rawCategories = Array.from(
    new Set([
      ...categories.map((c) => c.name),
      ...inventory.map((i) => i.category).filter(Boolean)
    ])
  );

  // Evitar duplicados de categorías en minúsculas si ya existen las descriptivas
  const allCategoryNames = rawCategories.filter((cat) => {
    const l = cat.toLowerCase().trim();
    if (l === 'epp' && rawCategories.some((x) => x.toLowerCase().includes('epp ('))) return false;
    if (l === 'ropa' && rawCategories.some((x) => x.toLowerCase().includes('ropa de'))) return false;
    return true;
  });

  // Filtrar insumos para el visor dinámico de stock
  const filteredInventoryItems = inventory.filter((item) => {
    const matchesSearch =
      !inventorySearch.trim() ||
      item.name.toLowerCase().includes(inventorySearch.toLowerCase().trim()) ||
      (item.category || '').toLowerCase().includes(inventorySearch.toLowerCase().trim());

    if (!matchesSearch) return false;

    return matchesCategory(item.category, selectedCategoryFilter);
  });

  const lowStockCount = inventory.filter((i) => i.current_stock > 0 && i.current_stock <= 10).length;
  const outOfStockCount = inventory.filter((i) => i.current_stock <= 0).length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
      
      {/* Formulario Principal (Columnas 1 a 7) */}
      <div className="xl:col-span-7 space-y-6">
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

          {/* SECCIÓN 2: DETALLE DE INSUMOS (CON CATEGORÍAS DINÁMICAS Y CANTIDADES DECIMALES) */}
          {selectedWorker && !isEditingWorker && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                  Detalle de Insumos / Equipo Entregado o Descargado
                </h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  {availableKits.length > 0 && (
                    <div className="relative">
                      <select
                        onChange={(e) => {
                          const kit = availableKits.find((k) => k.id === e.target.value);
                          if (kit) handleInsertKitItems(kit);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                        title="Desglosa todos los medicamentos del kit en filas individuales para que puedas quitar o editar los que necesites"
                      >
                        <option value="" disabled>+ Cargar Kit Botiquín (Desglosado)</option>
                        {availableKits.map((k) => (
                          <option key={k.id} value={k.id}>
                            📦 {k.name} ({k.items?.length || 0} medicamentos)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => append({ itemName: '', category: allCategoryNames[0] || 'EPP (Protección)', quantity: 1, conditionReason: transactionType === 'dotacion' ? 'nuevo' : 'desgaste_natural', photoUrl: null })}
                    className="flex items-center gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar Ítem
                  </button>
                </div>
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

                      {/* Categoría Dinámica */}
                      <div className="md:col-span-3">
                        <label className="text-xs font-black text-slate-700 block mb-1.5 uppercase flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-blue-600" /> Categoría
                        </label>
                        <select
                          {...register(`items.${index}.category`)}
                          className="w-full text-sm border border-slate-300 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        >
                          {allCategoryNames.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Nombre del Insumo */}
                      <div className="md:col-span-4">
                        <label className="text-xs font-black text-slate-700 block mb-1.5 uppercase">Insumo / Descripción</label>
                        <select
                          {...register(`items.${index}.itemName`)}
                          className="w-full text-sm border border-slate-300 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                        >
                          <option value="">-- Seleccionar insumo --</option>
                          {filteredCatalog.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.name} ({item.current_stock} disp.)
                            </option>
                          ))}
                        </select>
                        {errors.items?.[index]?.itemName && (
                          <span className="text-xs text-red-600 font-bold block mt-1">{errors.items[index]?.itemName?.message}</span>
                        )}
                        {availableKits.some((k) => k.name.toLowerCase() === (watch(`items.${index}.itemName`) || '').toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => handleUnpackKit(watch(`items.${index}.itemName`), index)}
                            className="mt-2 text-xs font-extrabold text-rose-800 hover:text-rose-950 bg-rose-100/80 hover:bg-rose-100 border border-rose-300 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 w-full justify-center shadow-xs cursor-pointer"
                            title="Desglosar en filas separadas para poder quitar o editar algún medicamento"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Desglosar medicamentos en filas independientes</span>
                          </button>
                        )}
                      </div>

                      {/* Cantidad (Soporta fracciones decimales como 22.5 o 3.5) */}
                      <div className="md:col-span-2">
                        <label className="text-xs font-black text-slate-700 block mb-1.5 uppercase">Cantidad (pza/par)</label>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder="Ej. 1"
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          className="w-full text-sm border border-slate-300 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-900"
                        />
                        {errors.items?.[index]?.quantity && (
                          <span className="text-xs text-red-600 font-bold block mt-1">{errors.items[index]?.quantity?.message}</span>
                        )}
                      </div>

                      {/* Estado / Motivo */}
                      <div className="md:col-span-3">
                        <label className="text-xs font-black text-slate-700 block mb-1.5 uppercase">Estado / Motivo</label>
                        <select
                          {...register(`items.${index}.conditionReason`)}
                          className="w-full text-sm border border-slate-300 bg-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
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

      {/* PANEL LATERAL: CATÁLOGO / GESTIÓN DE ALMACÉN Y CATEGORÍAS */}
      <div className="xl:col-span-5 space-y-6">
        
        {/* Card de Stock de Almacén y Gestión Integral */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-md space-y-5">
          
          {/* Cabecera del Panel de Almacén */}
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2.5">
                <Package className="w-5 h-5 text-blue-600" />
                Stock de Almacén
              </h3>
              <span className="text-xs sm:text-sm text-slate-500 font-bold block mt-0.5">
                {inventory.length} insumos registrados
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={loadInitialData}
                className="p-2.5 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition border border-slate-200 cursor-pointer shadow-xs"
                title="Recargar inventario"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Selector de Pestañas del Almacén */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs sm:text-sm font-black">
            <button
              type="button"
              onClick={() => {
                setInventoryManageTab('view');
                setManageItemError('');
                setManageItemSuccess('');
              }}
              className={`py-2.5 px-2 rounded-xl text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                inventoryManageTab === 'view'
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4 text-blue-600" />
              <span>Ver Stock</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInventoryManageTab('add');
                setManageItemError('');
                setManageItemSuccess('');
              }}
              className={`py-2.5 px-2 rounded-xl text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                inventoryManageTab === 'add'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>+ Insumo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInventoryManageTab('edit');
                setManageItemError('');
                setManageItemSuccess('');
              }}
              className={`py-2.5 px-2 rounded-xl text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                inventoryManageTab === 'edit'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit className="w-4 h-4 text-amber-600" />
              <span>Ajustar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInventoryManageTab('categories');
                setManageItemError('');
                setManageItemSuccess('');
              }}
              className={`py-2.5 px-2 rounded-xl text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                inventoryManageTab === 'categories'
                  ? 'bg-white text-purple-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-4 h-4 text-purple-600" />
              <span>Categorías</span>
            </button>
          </div>

          {/* Mensajes de Estado */}
          {manageItemError && (
            <p className="text-xs sm:text-sm text-red-600 font-black bg-red-50 border border-red-200 p-3 rounded-xl">
              {manageItemError}
            </p>
          )}
          {manageItemSuccess && (
            <p className="text-xs sm:text-sm text-emerald-700 font-black bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              {manageItemSuccess}
            </p>
          )}

          {/* PESTAÑA 1: VISOR DINÁMICO DE STOCK */}
          {inventoryManageTab === 'view' && (
            <div className="space-y-4">
              {/* Buscador de Insumos */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en stock (ej: casco, guante, bota)..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 text-sm sm:text-base bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition placeholder:text-slate-400 font-medium"
                />
                {inventorySearch && (
                  <button
                    type="button"
                    onClick={() => setInventorySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtros por Categoría */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Todos ({inventory.length})
                </button>
                {allCategoryNames.map((cat) => {
                  const count = inventory.filter((i) => matchesCategory(i.category, cat)).length;
                  const isSelected = matchesCategory(cat, selectedCategoryFilter) && selectedCategoryFilter !== 'all';
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat.toLowerCase().includes('epp') ? <HardHat className="w-4 h-4 text-amber-500" /> :
                       cat.toLowerCase().includes('botiqu') ? <HeartPulse className="w-4 h-4 text-rose-500" /> :
                       cat.toLowerCase().includes('ropa') ? <ShoppingBag className="w-4 h-4 text-blue-500" /> :
                       cat.toLowerCase().includes('herramienta') ? <Wrench className="w-4 h-4 text-indigo-500" /> :
                       <Tag className="w-4 h-4 text-slate-400" />}
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Lista de Insumos Filtrados */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredInventoryItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">No se encontraron insumos</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {inventorySearch ? 'Prueba con otro término de búsqueda' : 'No hay ítems registrados en esta categoría'}
                    </p>
                  </div>
                ) : (
                  filteredInventoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition group"
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate block">
                          {item.name}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-500 font-semibold block mt-0.5">
                          {item.category || 'General'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black ${
                            item.current_stock > 10
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.current_stock > 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {item.current_stock > 0 ? `${item.current_stock} u.` : 'Agotado'}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedManageItemId(item.id);
                            setNewManageStock(item.current_stock);
                            setInventoryManageTab('edit');
                          }}
                          className="p-2 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                          title="Ajustar stock de este insumo"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Resumen de Stock al Pie */}
              <div className="pt-3.5 border-t border-slate-200 flex flex-wrap justify-between items-center text-xs sm:text-sm text-slate-600 font-bold gap-2">
                <span>Total: <strong className="text-slate-900 text-sm font-black">{inventory.length}</strong></span>
                <span>Bajo stock: <strong className="text-amber-700 text-sm font-black">{lowStockCount}</strong></span>
                <span>Agotados: <strong className="text-rose-700 text-sm font-black">{outOfStockCount}</strong></span>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: AGREGAR NUEVO INSUMO */}
          {inventoryManageTab === 'add' && (
            <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 text-xs sm:text-sm">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="font-black text-slate-800 uppercase text-xs sm:text-sm tracking-wide">
                  Nuevo Insumo al Catálogo
                </span>
                <button
                  type="button"
                  onClick={() => setInventoryManageTab('view')}
                  className="text-blue-700 hover:text-blue-900 font-black text-xs sm:text-sm cursor-pointer"
                >
                  Volver a Stock
                </button>
              </div>

              <form onSubmit={handleCreateInventoryItem} className="space-y-3.5">
                <div>
                  <label className="font-black text-slate-700 block mb-1.5 uppercase text-xs sm:text-sm">Nombre del Insumo *</label>
                  <input
                    type="text"
                    placeholder="Ej. Guantes de Nitrilo Talla L"
                    value={newInventoryItem.name}
                    onChange={(e) => setNewInventoryItem({ ...newInventoryItem, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="font-black text-slate-700 block mb-1.5 uppercase text-xs sm:text-sm">Categoría *</label>
                  <select
                    value={newInventoryItem.category}
                    onChange={(e) => setNewInventoryItem({ ...newInventoryItem, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm sm:text-base bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {allCategoryNames.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-black text-slate-700 block mb-1.5 uppercase text-xs sm:text-sm">Stock Inicial (unidades)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newInventoryItem.currentStock}
                    onChange={(e) => setNewInventoryItem({ ...newInventoryItem, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm sm:text-base bg-white font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={manageLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl mt-3 transition flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer"
                >
                  {manageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Guardar en Catálogo</>}
                </button>
              </form>
            </div>
          )}

          {/* PESTAÑA 3: AJUSTAR STOCK O ELIMINAR INSUMO */}
          {inventoryManageTab === 'edit' && (
            <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 text-xs sm:text-sm">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="font-black text-slate-800 uppercase text-xs sm:text-sm tracking-wide">
                  Ajuste Directo de Stock
                </span>
                <button
                  type="button"
                  onClick={() => setInventoryManageTab('view')}
                  className="text-blue-700 hover:text-blue-900 font-black text-xs sm:text-sm cursor-pointer"
                >
                  Volver a Stock
                </button>
              </div>

              <form onSubmit={handleUpdateStock} className="space-y-3.5">
                <div>
                  <label className="font-black text-slate-700 block mb-1.5 uppercase text-xs sm:text-sm">Seleccionar Insumo</label>
                  <select
                    value={selectedManageItemId}
                    onChange={(e) => handleSelectManageItem(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm sm:text-base bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar insumo --</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — Stock actual: {item.current_stock} u. ({item.category})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedManageItemId && (
                  <>
                    <div>
                      <label className="font-black text-slate-700 block mb-1.5 uppercase text-xs sm:text-sm">Nuevo Stock Real</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={newManageStock}
                        onChange={(e) => setNewManageStock(parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm sm:text-base bg-white font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={manageLoading}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
                      >
                        {manageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Actualizar Stock</>}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteItem}
                        disabled={manageLoading}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl transition flex items-center justify-center text-sm shadow-sm cursor-pointer"
                        title="Eliminar insumo del catálogo"
                      >
                        {manageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}

          {/* PESTAÑA 4: GESTIÓN DE CATEGORÍAS */}
          {inventoryManageTab === 'categories' && (
            <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 text-xs sm:text-sm">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <span className="font-black text-slate-800 uppercase text-xs sm:text-sm tracking-wide">
                  Categorías de Almacén
                </span>
                <button
                  type="button"
                  onClick={() => setInventoryManageTab('view')}
                  className="text-blue-700 hover:text-blue-900 font-black text-xs sm:text-sm cursor-pointer"
                >
                  Volver a Stock
                </button>
              </div>

              {/* Crear Nueva Categoría */}
              <form onSubmit={handleCreateCategory} className="space-y-3 border-b border-slate-200 pb-4">
                <div>
                  <label className="font-black text-slate-700 block mb-1.5 uppercase flex items-center gap-1.5 text-xs sm:text-sm">
                    <Tag className="w-3.5 h-3.5 text-purple-600" /> Nueva Categoría
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Extintores y Señalización"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={manageLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
                >
                  {manageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Crear Categoría</>}
                </button>
              </form>

              {/* Categorías Activas con Botón para Ver Insumos */}
              <div className="space-y-2">
                <span className="font-black text-slate-600 uppercase block text-xs tracking-wider">
                  Categorías Activas ({allCategoryNames.length})
                </span>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {allCategoryNames.map((catName) => {
                    const countInCat = inventory.filter(i => (i.category || '').toLowerCase() === catName.toLowerCase()).length;
                    return (
                      <div key={catName} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-xl text-sm hover:border-slate-300 transition">
                        <div>
                          <span className="font-black text-slate-900 block text-sm sm:text-base">{catName}</span>
                          <span className="text-xs text-slate-500 font-semibold">{countInCat} insumo(s)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategoryFilter(catName);
                              setInventoryManageTab('view');
                            }}
                            className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer"
                            title={`Ver insumos de la categoría ${catName}`}
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(catName)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title={`Eliminar categoría ${catName}`}
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
