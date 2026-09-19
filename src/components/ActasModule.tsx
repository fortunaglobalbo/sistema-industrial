'use client';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ClipboardList, Loader2, Printer, Calendar, RefreshCw, Trash, FileText, FileDown, ListOrdered } from 'lucide-react';
import { getTransactionDetails, getRecentTransactions, deleteTransaction } from '@/app/actions/transaction';
import { exportActaToDocx } from '@/lib/exportActaDocx';
import TransactionForm from '@/components/TransactionForm';
import PrintReceipt from '@/components/PrintReceipt';
import TransactionItemsModal from '@/components/TransactionItemsModal';
import PlanillaConsolidadaView from '@/components/PlanillaConsolidadaView';
import Swal from 'sweetalert2';

// Shared by the industrial and medical workspaces, including exports and stock updates.
export default function ActasModule({ activeTab, onTabChange }: { activeTab: 'new' | 'history'; onTabChange: (tab: 'new' | 'history') => void }) {
  const setActiveTab = onTabChange;
  // Estados de Transacción y Previsualización
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<NonNullable<Awaited<ReturnType<typeof getTransactionDetails>>["transaction"]> | null>(null);
  const [itemsData, setItemsData] = useState<NonNullable<Awaited<ReturnType<typeof getTransactionDetails>>["items"]>>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados del Dashboard
  const [historyTransactions, setHistoryTransactions] = useState<Awaited<ReturnType<typeof getRecentTransactions>>>([]);
  const [loadingHistory, setLoadingHistory] = useState(activeTab === 'history');
  const [downloadingDocxId, setDownloadingDocxId] = useState<string | null>(null);
  const [managingItemsTransactionId, setManagingItemsTransactionId] = useState<string | null>(null);
  const [historySubTab, setHistorySubTab] = useState<'individual' | 'planilla'>('individual');

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await getRecentTransactions();
      setHistoryTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar historial de actas:', err);
      setHistoryTransactions([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'history') return;
    let alive = true;
    getRecentTransactions().then(data => {
      if (alive) setHistoryTransactions(Array.isArray(data) ? data : []);
    }).catch(() => {
      if (alive) setHistoryTransactions([]);
    }).finally(() => { if (alive) setLoadingHistory(false); });
    return () => { alive = false; };
  }, [activeTab]);
  // Cargar detalles de un acta seleccionada para visualización/impresión
  const handleLoadTransactionDetails = async (transactionId: string) => {
    setLoadingDetails(true);
    try {
      const res = await getTransactionDetails(transactionId);
      if (res.success && res.transaction) {
        setTransactionData(res.transaction);
        setItemsData(res.items || []);
        setActiveTransactionId(transactionId);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'No se pudieron recuperar los detalles del acta.',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error cargando los detalles del acta.',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Exportar acta directamente a Word DOCX desde el historial
  const handleDirectExportDocx = async (transactionId: string) => {
    setDownloadingDocxId(transactionId);
    try {
      const res = await getTransactionDetails(transactionId);
      if (res.success && res.transaction) {
        await exportActaToDocx(res.transaction, res.items || []);
        Swal.fire({
          icon: 'success',
          title: '¡Documento Word Descargado!',
          text: `El acta #${res.transaction.folio || ''} se exportó correctamente.`,
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.error || 'No se pudieron recuperar los datos del acta.',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error al exportar',
        text: 'Ocurrió un error inesperado al generar el archivo Word (.docx).',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setDownloadingDocxId(null);
    }
  };

  // Eliminar una transacción y actualizar el historial
  const handleDeleteTransaction = (transactionId: string) => {
    Swal.fire({
      title: '¿Eliminar transacción?',
      text: 'Se revertirá de forma automática el impacto en el stock del almacén.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoadingHistory(true);
        try {
          const res = await deleteTransaction(transactionId);
          if (res.success) {
            Swal.fire({
              icon: 'success',
              title: 'Eliminada',
              text: 'La transacción ha sido eliminada y el inventario fue restablecido.',
              confirmButtonColor: '#10b981'
            });
            loadHistory();
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: res.error || 'No se pudo eliminar la transacción.',
              confirmButtonColor: '#3b82f6'
            });
          }
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Ocurrió un error inesperado al eliminar la transacción.',
            confirmButtonColor: '#3b82f6'
          });
        } finally {
          setLoadingHistory(false);
        }
      }
    });
  };

  const handleBackToDashboard = () => {
    setActiveTransactionId(null);
    setTransactionData(null);
    setItemsData([]);
    if (activeTab === 'new') {
      setActiveTab('history');
    } else {
      loadHistory();
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const translateType = (type: string) => {
    switch (type) {
      case 'dotacion': return 'Dotación';
      case 'entrega': return 'Entrega';
      case 'devolucion': return 'Devolución';
      case 'intercambio': return 'Intercambio';
      case 'desuso': return 'En Desuso';
      default: return type;
    }
  };

  return <>
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-600">Generando documento y cargando detalles del acta...</p>
          </div>
        ) : activeTransactionId && transactionData ? (
          /* Vista de Impresión del Acta (Centrada y adaptada a la pantalla) */
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs flex gap-2 items-start print:hidden shadow-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Vista de Acta - Folio #{transactionData.folio}</p>
                <p className="mt-0.5">Puedes imprimir este comprobante en formato Carta pulsando <strong>Imprimir Acta</strong> o descargarlo en formato editable pulsando <strong>Exportar a Word (DOCX)</strong>.</p>
              </div>
            </div>
            <PrintReceipt
              transaction={transactionData}
              items={itemsData}
              onBack={handleBackToDashboard}
            />
          </div>
        ) : (
<>
            {activeTab === 'new' ? (
              <TransactionForm onSuccess={handleTransactionSuccess => handleLoadTransactionDetails(handleTransactionSuccess)} />
            ) : activeTab === 'history' ? (
              /* CONTENIDO DE PESTAÑA: HISTORIAL Y REIMPRESIONES */
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                {/* SELECTOR DE SUB-PESTAÑA: ACTAS INDIVIDUALES O PLANILLA CONSOLIDADA */}
                <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setHistorySubTab('individual')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          historySubTab === 'individual'
                            ? 'bg-[#002f6c] text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-blue-300" />
                        Actas Individuales
                      </button>
                      <button
                        onClick={() => setHistorySubTab('planilla')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          historySubTab === 'planilla'
                            ? 'bg-[#002f6c] text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        Planilla Consolidada / Mensual
                      </button>
                    </div>
                  </div>

                  {historySubTab === 'individual' && (
                    <button
                      onClick={loadHistory}
                      disabled={loadingHistory}
                      className="text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer"
                      title="Actualizar historial de actas"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-blue-600' : ''}`} />
                      Actualizar
                    </button>
                  )}
                </div>

                {historySubTab === 'planilla' ? (
                  /* VISTA INTEGRADA DE PLANILLA CONSOLIDADA (ROPA, DESUSO, EPP) */
                  <PlanillaConsolidadaView onBackToIndividual={() => setHistorySubTab('individual')} />
                ) : (
                  /* VISTA DE ACTAS INDIVIDUALES */
                  <>
                    {loadingHistory ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <p className="text-xs text-slate-500">Cargando transacciones...</p>
                      </div>
                    ) : historyTransactions.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                        No se encontraron actas registradas en el sistema.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                              <th className="p-3 text-center">N° Folio</th>
                              <th className="p-3 text-left">Fecha</th>
                              <th className="p-3 text-left">Trabajador</th>
                              <th className="p-3 text-left">Operación</th>
                              <th className="p-3 text-left">Autorizado por</th>
                              <th className="p-3 text-center w-48">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {historyTransactions.map((t) => (
                              <tr key={t.id} className="hover:bg-slate-50/50 transition">
                                <td className="p-3 text-center font-bold text-slate-700 font-mono">#{t.folio}</td>
                                <td className="p-3 text-slate-500 whitespace-nowrap">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    {formatDate(t.createdAt)}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-slate-800">
                                  <div>
                                    <p>{t.workerName}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">C.I. {t.workerCi}</p>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border ${
                                    t.transactionType === 'dotacion' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : t.transactionType === 'entrega' 
                                      ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                      : t.transactionType === 'devolucion' 
                                      ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                      : t.transactionType === 'desuso' 
                                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    {translateType(t.transactionType)}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 font-medium">{t.supervisorName}</td>
                                <td className="p-3 text-center flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setManagingItemsTransactionId(t.id)}
                                    className="flex items-center justify-center gap-1 bg-[#002f6c] hover:bg-[#003876] text-white font-bold px-2.5 py-1.5 rounded-lg transition shadow-sm cursor-pointer text-xs"
                                    title="Corregir o eliminar ítems individuales de este kit/acta sin borrar toda la transacción"
                                  >
                                    <ListOrdered className="w-3.5 h-3.5 text-amber-300" />
                                    Ítems
                                  </button>
                                  <button
                                    onClick={() => handleDirectExportDocx(t.id)}
                                    disabled={downloadingDocxId === t.id}
                                    className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-2 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                                    title="Descargar Acta en Word (.docx)"
                                  >
                                    {downloadingDocxId === t.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <FileDown className="w-3.5 h-3.5" />
                                    )}
                                    Word
                                  </button>
                                  <button
                                    onClick={() => handleLoadTransactionDetails(t.id)}
                                    className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-900 text-white font-bold px-2 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                                    title="Ver / Reimprimir Acta"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimir
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(t.id)}
                                    className="flex items-center justify-center p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition shadow-sm cursor-pointer"
                                    title="Eliminar Transacción de Historial"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* MODAL DE GESTIÓN Y CORRECCIÓN DE ÍTEMS INDIVIDUALES */}
                    <TransactionItemsModal
                      transactionId={managingItemsTransactionId || ''}
                      isOpen={!!managingItemsTransactionId}
                      onClose={() => setManagingItemsTransactionId(null)}
                      onRefreshParent={loadHistory}
                    />
                  </>
                )}
              </div>
            ) : null}
</>
)}
</>;
}
