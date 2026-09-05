'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Trash2, Edit2, Check, AlertTriangle, 
  Package, Loader2, RefreshCw, ShieldAlert, CheckCircle2 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  getTransactionItems, 
  deleteTransactionItem, 
  updateTransactionItem 
} from '@/app/actions/transaction';

interface TransactionItemsModalProps {
  transactionId: string;
  isOpen: boolean;
  onClose: () => void;
  onRefreshParent: () => void;
}

export default function TransactionItemsModal({
  transactionId,
  isOpen,
  onClose,
  onRefreshParent
}: TransactionItemsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editReason, setEditReason] = useState('nuevo');
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    if (isOpen && transactionId) {
      loadItems();
    }
  }, [isOpen, transactionId]);

  const loadItems = async () => {
    setLoading(true);
    setEditingItemId(null);
    const res = await getTransactionItems(transactionId);
    if (res.success) {
      setData(res);
    } else {
      Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    }
    setLoading(false);
  };

  const handleStartEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditName(item.item_name);
    setEditQuantity(Number(item.quantity));
    setEditReason(item.condition_reason || 'nuevo');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'El nombre del ítem no puede estar vacío.' });
      return;
    }
    if (editQuantity <= 0) {
      Swal.fire({ icon: 'warning', title: 'Cantidad inválida', text: 'La cantidad debe ser mayor a cero.' });
      return;
    }

    setSavingItem(true);
    const res = await updateTransactionItem(itemId, transactionId, {
      itemName: editName,
      quantity: editQuantity,
      conditionReason: editReason
    });
    setSavingItem(false);

    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Ítem corregido',
        text: 'Los cambios fueron guardados y el inventario actualizado.',
        timer: 1500,
        showConfirmButton: false
      });
      setEditingItemId(null);
      loadItems();
      onRefreshParent();
    } else {
      Swal.fire({ icon: 'error', title: 'Error al actualizar', text: res.error });
    }
  };

  const handleDeleteItem = async (item: any) => {
    const isSingle = data?.items?.length === 1;
    const confirm = await Swal.fire({
      title: '¿Eliminar este ítem?',
      html: `
        <div class="text-left text-xs text-slate-600 space-y-1">
          <p><strong>Ítem:</strong> ${item.item_name}</p>
          <p><strong>Cantidad:</strong> ${item.quantity}</p>
          ${isSingle ? '<p class="text-rose-600 font-bold mt-2">⚠️ Este es el único ítem del acta. Al eliminarlo, el acta quedará vacía.</p>' : ''}
          <p class="text-slate-500 mt-2">El stock correspondiente será restituido al inventario de almacén automáticamente.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar ítem',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      const res = await deleteTransactionItem(item.id, transactionId);
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Ítem eliminado',
          text: 'El ítem fue retirado del acta y el inventario restituido.',
          timer: 1500,
          showConfirmButton: false
        });
        loadItems();
        onRefreshParent();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      }
    }
  };

  if (!isOpen) return null;

  const trans = data?.transaction;
  const items = data?.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-5 flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/10 rounded-lg text-emerald-400">
                <Package className="w-5 h-5" />
              </span>
              <h3 className="text-base font-extrabold tracking-tight">
                Gestión y Corrección de Ítems del Acta
              </h3>
            </div>
            {trans && (
              <p className="text-xs text-blue-200">
                Trabajador: <strong className="text-white">{trans.workers?.full_name}</strong> (C.I. {trans.workers?.ci}) • {trans.workers?.department}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Puedes corregir cantidades o eliminar medicamentos/insumos en los que haya habido error sin borrar toda el acta.
            </span>
          </div>
          <button
            onClick={loadItems}
            disabled={loading}
            className="text-slate-600 hover:text-slate-900 p-1 rounded transition"
            title="Recargar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Cuerpo / Lista de Ítems */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs font-bold text-slate-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Cargando medicamentos e insumos del acta...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 rounded-xl">
              No hay ítems registrados en esta transacción.
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item: any, idx: number) => {
                const isEditing = editingItemId === item.id;

                if (isEditing) {
                  return (
                    <div 
                      key={item.id} 
                      className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 animate-in fade-in"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-blue-900">
                          Editando Ítem #{idx + 1}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                        <div className="md:col-span-6">
                          <label className="text-[9px] font-bold text-slate-600 block mb-1 uppercase">Descripción / Medicamento</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-[9px] font-bold text-slate-600 block mb-1 uppercase">Cantidad</label>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(Number(e.target.value))}
                            className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-[9px] font-bold text-slate-600 block mb-1 uppercase">Estado / Motivo</label>
                          <select
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="w-full text-xs font-bold border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="nuevo">Nuevo</option>
                            <option value="desgaste_natural">Desgaste Natural</option>
                            <option value="dano_operativo">Daño Operativo</option>
                            <option value="defecto_fabrica">Defecto Fábrica</option>
                            <option value="cambio_talla">Cambio de Talla</option>
                            <option value="en_desuso">En Desuso</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1 border-t border-blue-100">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={savingItem}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={savingItem}
                          className="px-4 py-1.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-1 shadow-sm"
                        >
                          {savingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 uppercase truncate">
                          {item.item_name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Categoría: <span className="font-semibold text-slate-700">{item.category}</span> • Estado: <span className="font-semibold text-slate-700">{item.condition_reason}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-mono font-black text-slate-800 shadow-2xs">
                        {item.quantity} pza/par
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg transition shadow-2xs"
                          title="Editar este ítem"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition shadow-2xs"
                          title="Eliminar solo este ítem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">
            Total ítems en esta asignación: <strong className="text-slate-900">{items.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition shadow"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
