'use server';

import { supabase } from '@/lib/supabase';

export interface WorkerData {
  id?: string;
  fullName: string;
  ci: string;
  position: string;
  department: string;
  supervisorName: string;
}

export interface TransactionItemData {
  itemName: string;
  category: 'ropa' | 'epp' | 'herramientas' | 'botiquin';
  quantity: number;
  conditionReason: 'desgaste_natural' | 'dano_operativo' | 'defecto_fabrica' | 'cambio_talla' | 'nuevo' | 'en_desuso';
  photoUrl?: string | null;
}

export interface TransactionData {
  workerId: string;
  supervisorName: string;
  supervisorRoleTitle?: string;
  transactionType: 'devolucion' | 'entrega' | 'intercambio' | 'dotacion' | 'desuso';
  signatureUrl?: string | null;
  items: TransactionItemData[];
}

/**
 * Buscar trabajadores por CI o Nombre completo.
 */
export async function searchWorkers(query: string) {
  try {
    if (!query) return [];

    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .or(`ci.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    return data.map((w) => ({
      id: w.id,
      fullName: w.full_name,
      ci: w.ci,
      position: w.position,
      department: w.department,
      supervisorName: w.supervisor_name,
    }));
  } catch (error) {
    console.error('Error al buscar trabajadores:', error);
    return [];
  }
}

/**
 * Obtener todos los trabajadores (para autocompletado inicial).
 */
export async function getWorkers() {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data.map((w) => ({
      id: w.id,
      fullName: w.full_name,
      ci: w.ci,
      position: w.position,
      department: w.department,
      supervisorName: w.supervisor_name,
    }));
  } catch (error) {
    console.error('Error al obtener trabajadores:', error);
    return [];
  }
}

/**
 * Crear un nuevo trabajador de forma rápida.
 */
export async function createWorker(worker: WorkerData) {
  try {
    const { data, error } = await supabase
      .from('workers')
      .insert([
        {
          full_name: worker.fullName,
          ci: worker.ci,
          position: worker.position,
          department: worker.department,
          supervisor_name: worker.supervisorName,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      worker: {
        id: data.id,
        fullName: data.full_name,
        ci: data.ci,
        position: data.position,
        department: data.department,
        supervisorName: data.supervisor_name,
      },
    };
  } catch (error: any) {
    console.error('Error al crear trabajador:', error);
    return { success: false, error: error.message || 'Error al guardar el trabajador.' };
  }
}

/**
 * Obtener items de inventario.
 */
export async function getInventory() {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    return [];
  }
}

/**
 * Registrar una transacción completa (cabecera, detalles y ajuste de inventario).
 */
export async function registerTransaction(data: TransactionData) {
  try {
    // 1. Insertar Cabecera de la Transacción
    const { data: transData, error: transError } = await supabase
      .from('transactions')
      .insert([
        {
          worker_id: data.workerId,
          supervisor_name: data.supervisorName,
          transaction_type: data.transactionType,
          signature_url: data.signatureUrl || '',
        },
      ])
      .select()
      .single();

    if (transError) throw transError;

    const transactionId = transData.id;

    // 2. Insertar los detalles de los items
    const itemsToInsert = data.items.map((item) => ({
      transaction_id: transactionId,
      item_name: item.itemName,
      category: item.category,
      quantity: Number(item.quantity),
      condition_reason: item.conditionReason,
      photo_url: item.photoUrl || null,
    }));

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // 3. Ajustar Inventario (Stock)
    for (const item of data.items) {
      const qty = Number(item.quantity);
      // Intentar obtener el item del inventario actual para validar stock
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('id, current_stock')
        .eq('name', item.itemName)
        .single();

      if (invData) {
        let newStock = Number(invData.current_stock);

        if (data.transactionType === 'entrega' || data.transactionType === 'dotacion' || data.transactionType === 'desuso') {
          // Restar stock para entregas, dotaciones iniciales y materiales puestos en desuso/baja
          newStock = Math.max(0, newStock - qty);
        } else if (data.transactionType === 'devolucion') {
          // Sumar stock para devoluciones SOLO si el insumo está en estado reutilizable (nuevo o cambio_talla)
          if (item.conditionReason === 'nuevo' || item.conditionReason === 'cambio_talla') {
            newStock = newStock + qty;
          }
        } else if (data.transactionType === 'intercambio') {
          // Un intercambio entrega un item nuevo (resta stock)
          newStock = Math.max(0, newStock - qty);
        }

        // Redondear a 2 decimales
        newStock = Math.round(newStock * 100) / 100;

        // Actualizar base de datos
        await supabase
          .from('inventory_items')
          .update({ current_stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', invData.id);
      } else {
        // Si el item no existe en el catálogo de inventario, lo insertamos
        let initialStock = 0;
        if (data.transactionType === 'devolucion' && (item.conditionReason === 'nuevo' || item.conditionReason === 'cambio_talla')) {
          initialStock = qty;
        }

        await supabase
          .from('inventory_items')
          .insert([
            {
              name: item.itemName,
              category: item.category,
              current_stock: initialStock,
            },
          ]);
      }
    }

    return { success: true, transactionId };
  } catch (error: any) {
    console.error('Error al registrar transacción:', error);
    return { success: false, error: error.message || 'Error al registrar la transacción en la base de datos.' };
  }
}

/**
 * Obtener detalles completos de una transacción (para visualización e impresión).
 */
export async function getTransactionDetails(id: string) {
  try {
    const { data: trans, error: transError } = await supabase
      .from('transactions')
      .select(`
        *,
        workers (
          full_name,
          ci,
          position,
          department,
          supervisor_name
        )
      `)
      .eq('id', id)
      .single();

    if (transError) throw transError;

    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', id);

    if (itemsError) throw itemsError;

    // Obtener correlativo secuencial (folio) de la transacción
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .lte('created_at', trans.created_at);

    const folio = String(count || 1).padStart(5, '0');

    return {
      success: true,
      transaction: {
        id: trans.id,
        folio,
        createdAt: trans.created_at,
        supervisorName: trans.supervisor_name,
        transactionType: trans.transaction_type,
        signatureUrl: trans.signature_url,
        worker: {
          fullName: trans.workers ? trans.workers.full_name : 'No especificado',
          ci: trans.workers ? trans.workers.ci : 'S/N',
          position: trans.workers ? trans.workers.position : '-',
          department: trans.workers ? trans.workers.department : '-',
          supervisorName: trans.workers ? trans.workers.supervisor_name : trans.supervisor_name,
        },
      },
      items: items.map((i) => ({
        id: i.id,
        itemName: i.item_name,
        category: i.category,
        quantity: Number(i.quantity),
        conditionReason: i.condition_reason,
        photoUrl: i.photo_url,
      })),
    };
  } catch (error: any) {
    console.error('Error al obtener detalles de la transacción:', error);
    return { success: false, error: error.message || 'Error al obtener los detalles del acta.' };
  }
}

/**
 * Actualizar datos de un trabajador.
 */
export async function updateWorker(id: string, worker: WorkerData) {
  try {
    const { error } = await supabase
      .from('workers')
      .update({
        full_name: worker.fullName,
        ci: worker.ci,
        position: worker.position,
        department: worker.department,
        supervisor_name: worker.supervisorName,
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error al actualizar trabajador:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar un trabajador (y todas sus transacciones asociadas en cascada).
 */
export async function deleteWorker(id: string) {
  try {
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id')
      .eq('worker_id', id);

    if (transError) throw transError;

    if (transactions && transactions.length > 0) {
      for (const t of transactions) {
        const res = await deleteTransaction(t.id);
        if (!res.success) throw new Error(res.error);
      }
    }

    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar trabajador:', error);
    return { success: false, error: error.message || 'Error al eliminar trabajador.' };
  }
}

/**
 * Agregar un nuevo insumo al catálogo de inventario.
 */
export async function addInventoryItem(name: string, category: 'ropa' | 'epp' | 'herramientas' | 'botiquin', currentStock: number) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([
        {
          name,
          category,
          current_stock: Number(currentStock),
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, item: data };
  } catch (error: any) {
    console.error('Error al agregar insumo:', error);
    return { success: false, error: error.message || 'El insumo ya existe en el catálogo.' };
  }
}

/**
 * Actualizar el stock actual de un insumo directamente.
 */
export async function updateInventoryStock(id: string, currentStock: number) {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .update({
        current_stock: Number(currentStock),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error al actualizar stock:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Eliminar un insumo del catálogo.
 */
export async function deleteInventoryItem(id: string) {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar insumo:', error);
    return { success: false, error: error.message || 'No se puede eliminar el insumo si ya tiene registros de entrega o devolución.' };
  }
}

/**
 * Obtener historial de transacciones recientes para reimpresión.
 */
export async function getRecentTransactions() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        created_at,
        transaction_type,
        supervisor_name,
        workers (
          full_name,
          ci
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalCount = data.length;
    return data.map((t, index) => {
      const folio = String(totalCount - index).padStart(5, '0');
      return {
        id: t.id,
        folio,
        createdAt: t.created_at,
        transactionType: t.transaction_type,
        supervisorName: t.supervisor_name,
        workerName: t.workers ? (t.workers as any).full_name : 'Desconocido',
        workerCi: t.workers ? (t.workers as any).ci : '',
      };
    });
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return [];
  }
}

/**
 * Eliminar una transacción del historial y reversar su impacto en el inventario.
 */
export async function deleteTransaction(id: string) {
  try {
    const { data: trans, error: transError } = await supabase
      .from('transactions')
      .select('transaction_type')
      .eq('id', id)
      .single();

    if (transError && transError.code !== 'PGRST116') throw transError;

    if (trans) {
      const { data: items } = await supabase
        .from('transaction_items')
        .select('item_name, quantity, condition_reason')
        .eq('transaction_id', id);

      if (items && items.length > 0) {
        for (const item of items) {
          const qty = Number(item.quantity);
          const { data: invData } = await supabase
            .from('inventory_items')
            .select('id, current_stock')
            .eq('name', item.item_name)
            .single();

          if (invData) {
            let newStock = Number(invData.current_stock);
            if (trans.transaction_type === 'entrega' || trans.transaction_type === 'dotacion' || trans.transaction_type === 'intercambio' || trans.transaction_type === 'desuso') {
              newStock = newStock + qty;
            } else if (trans.transaction_type === 'devolucion') {
              if (item.condition_reason === 'nuevo' || item.condition_reason === 'cambio_talla') {
                newStock = Math.max(0, newStock - qty);
              }
            }

            newStock = Math.round(newStock * 100) / 100;

            await supabase
              .from('inventory_items')
              .update({ current_stock: newStock, updated_at: new Date().toISOString() })
              .eq('id', invData.id);
          }
        }
      }
    }

    const { error: delError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (delError) throw delError;

    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar transacción:', error);
    return { success: false, error: error.message || 'No se pudo eliminar la transacción.' };
  }
}
