'use client';

import React, { useState } from 'react';
import { ShieldCheck, HardHat, FileText, Plus, ClipboardList, Loader2 } from 'lucide-react';
import { getTransactionDetails } from './actions/transaction';
import TransactionForm from '@/components/TransactionForm';
import PrintReceipt from '@/components/PrintReceipt';

export default function Home() {
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<any | null>(null);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Callback ejecutado tras guardar exitosamente el descargo
  const handleTransactionSuccess = async (transactionId: string) => {
    setLoadingDetails(true);
    try {
      const res = await getTransactionDetails(transactionId);
      if (res.success && res.transaction) {
        setTransactionData(res.transaction);
        setItemsData(res.items || []);
        setActiveTransactionId(transactionId);
      } else {
        alert(res.error || 'No se pudieron recuperar los detalles del acta generada.');
      }
    } catch (err) {
      console.error(err);
      alert('Error cargando detalles del acta.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBackToForm = () => {
    setActiveTransactionId(null);
    setTransactionData(null);
    setItemsData([]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased">
      {/* Header Institucional (Oculto en Impresión por CSS en globals.css) */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-inner">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wide uppercase">Seguridad Industrial</h1>
              <p className="text-xs text-slate-400 font-semibold">Control de Inventario y Descargo de EPP</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Almacén Central Activo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Cuerpo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-600">Generando documento y cargando detalles del acta...</p>
          </div>
        ) : activeTransactionId && transactionData ? (
          /* Vista de Impresión del Acta */
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs flex gap-2 items-start print:hidden shadow-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">¡Transacción Registrada con Éxito!</p>
                <p className="mt-0.5">El acta ha sido archivada con el Folio <strong className="font-bold">#{transactionData.folio}</strong>. Puedes imprimir este comprobante para firmas físicas. El sistema ya descontó/añadió los insumos del inventario.</p>
              </div>
            </div>
            <PrintReceipt
              transaction={transactionData}
              items={itemsData}
              onBack={handleBackToForm}
            />
          </div>
        ) : (
          /* Vista de Formulario de Registro */
          <div className="space-y-4">
            {/* Título de la página */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Registro de Entrega y Devolución</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Completa el formulario para registrar el descargo del personal y generar el acta de conformidad.</p>
              </div>
              <div className="flex items-center gap-3 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="flex items-center gap-1 font-bold text-slate-600">
                  <HardHat className="w-4 h-4 text-blue-600" /> EPP
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 font-bold text-slate-600">
                  <ClipboardList className="w-4 h-4 text-blue-600" /> Ropa
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 font-bold text-slate-600">
                  <FileText className="w-4 h-4 text-blue-600" /> Herramientas
                </span>
              </div>
            </div>

            <TransactionForm onSuccess={handleTransactionSuccess} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-semibold print:hidden mt-auto">
        <p>Sistema de Gestión de Seguridad e Higiene Ocupacional © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
