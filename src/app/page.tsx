'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, ClipboardList, Loader2, 
  Lock, KeyRound, LogOut, History, PlusCircle, Printer, Calendar, RefreshCw, Trash, Wrench
} from 'lucide-react';
import { getTransactionDetails, getRecentTransactions, deleteTransaction } from './actions/transaction';
import TransactionForm from '@/components/TransactionForm';
import PrintReceipt from '@/components/PrintReceipt';
import FormularioHerramientas from '@/components/FormularioHerramientas';
import Swal from 'sweetalert2';

export default function Home() {
  // Estados de Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Estados de Transacción y Previsualización
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<any | null>(null);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados del Dashboard
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'toolRequests'>('new');
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Cargar sesión al iniciar
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token_sistema_industrial');
    if (savedToken === '7526197') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  // Cargar historial de transacciones al cambiar a la pestaña de historial
  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated) {
      loadHistory();
    }
  }, [activeTab, isAuthenticated]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const data = await getRecentTransactions();
    setHistoryTransactions(data);
    setLoadingHistory(false);
  };

  // Validar PIN de seguridad
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (pinInput === '7526197') {
      localStorage.setItem('auth_token_sistema_industrial', '7526197');
      setIsAuthenticated(true);
      setPinInput('');
    } else {
      setLoginError('Código de seguridad incorrecto. Intente de nuevo.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token_sistema_industrial');
    setIsAuthenticated(false);
    setActiveTransactionId(null);
    setTransactionData(null);
    setItemsData([]);
  };

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

  // Renderizar pantalla de Login si no está autenticado
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4 font-sans antialiased">
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-blue-600/10 text-blue-500 rounded-full border border-blue-500/20 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Acceso Restringido</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Ingrese el código de acceso de seguridad industrial</p>
          </div>

          {loginError && (
            <div className="bg-red-950/40 text-red-400 border border-red-900/50 rounded-xl p-3 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="Código de seguridad..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-bold border border-slate-700 bg-slate-800/50 hover:bg-slate-800 rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg transition"
            >
              Ingresar al Sistema
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <Link
              href="/formulario"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-lg transition border border-blue-400/30"
            >
              <Wrench className="w-4 h-4 text-amber-300" />
              <span>Formulario Requerimiento Herramientas</span>
            </Link>
            <p className="text-[10px] text-slate-500 font-medium">
              Acceso directo para supervisores y técnicos
            </p>
          </div>

          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
            Seguridad e Higiene Industrial v1.0
          </p>
        </div>
      </div>
    );
  }

  // Renderizar aplicación principal
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased">
      
      {/* Header Institucional (Oculto en Impresión) */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-inner">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wide uppercase">ENDE ORURO</h1>
              <p className="text-xs text-slate-400 font-semibold">Sistema de Seguridad Industrial y Control de EPP</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <Link
              href="/formulario"
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold px-3.5 py-2 rounded-xl shadow-lg transition border border-blue-400/30"
              title="Abrir Formulario de Requerimiento de Herramientas para Técnicos"
            >
              <Wrench className="w-4 h-4 text-amber-300" />
              <span>Formulario Requerimiento Herramientas</span>
            </Link>

            <div className="hidden md:flex items-center gap-1.5 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Almacén Central Activo</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-950 hover:border-red-900/50 px-3 py-2 rounded-xl transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Bloquear</span>
            </button>
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
          /* Vista de Impresión del Acta (Puede imprimirse infinitas veces) */
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs flex gap-2 items-start print:hidden shadow-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Vista de Acta - Folio #{transactionData.folio}</p>
                <p className="mt-0.5">Puedes imprimir este comprobante en formato Carta cuantas veces lo necesites pulsando el botón **"Imprimir Acta"**.</p>
              </div>
            </div>
            <PrintReceipt
              transaction={transactionData}
              items={itemsData}
              onBack={handleBackToDashboard}
            />
          </div>
        ) : (
          /* Dashboard Principal con Tabulación */
          <div className="space-y-6">
            
            {/* Título y Barra de Navegación del Dashboard */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Panel de Control de EPP</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Gestión de dotaciones a personal nuevo, entregas, devoluciones, desuso y herramientas.</p>
              </div>

              {/* Botones de Pestañas (Registrar vs Historial vs Requerimientos Herramientas) */}
              <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200 w-full md:w-auto gap-1">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <PlusCircle className="w-4 h-4 text-blue-600" />
                  Registrar Acta
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <History className="w-4 h-4 text-blue-600" />
                  Historial Actas EPP
                </button>
                <button
                  onClick={() => setActiveTab('toolRequests')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'toolRequests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Wrench className="w-4 h-4 text-blue-600" />
                  Requerimientos Herramientas
                </button>
              </div>
            </div>

            {/* CONTENIDO DE PESTAÑA: REGISTRAR NUEVA ACTA */}
            {activeTab === 'new' ? (
              <TransactionForm onSuccess={handleTransactionSuccess => handleLoadTransactionDetails(handleTransactionSuccess)} />
            ) : activeTab === 'history' ? (
              /* CONTENIDO DE PESTAÑA: HISTORIAL Y REIMPRESIONES */
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                    Historial de Actas Registradas
                  </h3>
                  <button
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    className="text-slate-400 hover:text-slate-600 transition flex items-center gap-1 text-xs font-semibold"
                    title="Actualizar historial"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>

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
                          <th className="p-3 text-center w-28">Acción</th>
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
                                onClick={() => handleLoadTransactionDetails(t.id)}
                                className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-900 text-white font-bold px-2.5 py-1.5 rounded-lg transition shadow-sm"
                                title="Ver / Reimprimir Acta"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Reimprimir
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="flex items-center justify-center p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition shadow-sm"
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
              </div>
            ) : (
              /* CONTENIDO DE PESTAÑA: REQUERIMIENTOS DE HERRAMIENTAS (HISTORIAL Y CONTROL) */
              <FormularioHerramientas showTabs={false} initialTab="history" />
            )}

          </div>
        )}
      </main>

      {/* Footer (Oculto en Impresión) */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-semibold print:hidden mt-auto">
        <p>Sistema de Seguridad Industrial - ENDE ORURO © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
