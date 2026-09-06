'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, ClipboardList, Loader2, 
  Lock, KeyRound, LogOut, History, PlusCircle, Printer, Calendar, RefreshCw, Trash, Wrench, Footprints, Flame, Droplets, FileText, HeartPulse, FileDown, ListOrdered, CalendarDays
} from 'lucide-react';
import { getTransactionDetails, getRecentTransactions, deleteTransaction } from './actions/transaction';
import { exportActaToDocx } from '@/lib/exportActaDocx';
import TransactionForm from '@/components/TransactionForm';
import PrintReceipt from '@/components/PrintReceipt';
import FormularioHerramientas from '@/components/FormularioHerramientas';
import FormularioTallasBotines from '@/components/FormularioTallasBotines';
import ModuloExtintores from '@/components/ModuloExtintores';
import ModuloControlAgua from '@/components/ModuloControlAgua';
import ModuloCites from '@/components/ModuloCites';
import ModuloMedicamentosKits from '@/components/ModuloMedicamentosKits';
import ModuloAvisosCronograma from '@/components/ModuloAvisosCronograma';
import TransactionItemsModal from '@/components/TransactionItemsModal';
import FloatingTeamChat from '@/components/FloatingTeamChat';
import { TEAM_USERS, getUserByPin, TeamUser } from '@/lib/teamAuth';
import Swal from 'sweetalert2';

export default function Home() {
  // Estados de Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<TeamUser | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Estados de Transacción y Previsualización
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<any | null>(null);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estados del Dashboard
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'toolRequests' | 'bootSizeRequests' | 'extinguishers' | 'waterSupply' | 'cites' | 'medicineKits' | 'notices'>('new');
  const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingDocxId, setDownloadingDocxId] = useState<string | null>(null);
  const [managingItemsTransactionId, setManagingItemsTransactionId] = useState<string | null>(null);

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    new: {
      title: 'Registrar Acta de Dotación / Entrega',
      subtitle: 'Formulario oficial de asignación de EPP, ropa de trabajo, botiquines y herramientas a personal.',
    },
    history: {
      title: 'Historial de Actas y Dotaciones EPP',
      subtitle: 'Consulta, reimpresión en Word/PDF y corrección de ítems de actas emitidas.',
    },
    toolRequests: {
      title: 'Control de Requerimientos de Herramientas',
      subtitle: 'Solicitudes operativas, seguimiento y planillas de herramientas por cuadrilla.',
    },
    bootSizeRequests: {
      title: 'Registro y Consolidado de Tallas de Botines',
      subtitle: 'Relevamiento oficial de tallas y calzado industrial para el personal técnico y administrativo.',
    },
    extinguishers: {
      title: 'Inspección y Relevamiento de Extintores',
      subtitle: 'Control de carga, vencimiento, presión y ubicación de extintores en instalaciones.',
    },
    waterSupply: {
      title: 'Control y Suministro de Agua (Aquabel 20L)',
      subtitle: 'Auditoría contra contrato anual de 440 bidones y salidas por área con escaneo OCR de firmas.',
    },
    cites: {
      title: 'Correspondencia Oficial (CITES a Gerencia)',
      subtitle: 'Generación, correlativo oficial y seguimiento de notas a gerencia general.',
    },
    medicineKits: {
      title: 'Gestión y Armado de Kits de Medicamentos / Botiquines',
      subtitle: 'Catálogo oficial y composición de botiquines para cuadrillas y personal.',
    },
    notices: {
      title: 'Cronograma de Actividades y Cuadro de Avisos',
      subtitle: 'Planificación oficial, registro de inspecciones y seguimiento de tareas del área de Seguridad y Salud Ocupacional.',
    },
  };

  // Cargar sesión al iniciar de forma ultra segura
  useEffect(() => {
    try {
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token_sistema_industrial') : null;
      if (savedToken && TEAM_USERS[savedToken]) {
        setCurrentUser(TEAM_USERS[savedToken]);
        setIsAuthenticated(true);
      } else if (savedToken === '7526197') {
        setCurrentUser(TEAM_USERS['7526197']);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }

    // Timer de seguridad: si tras 800ms sigue en null, mostrar la pantalla de PIN sin trabarse
    const safetyTimer = setTimeout(() => {
      setIsAuthenticated((prev) => (prev === null ? false : prev));
    }, 800);

    return () => clearTimeout(safetyTimer);
  }, []);

  // Cargar historial de transacciones al cambiar a la pestaña de historial
  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated) {
      loadHistory();
    }
  }, [activeTab, isAuthenticated]);

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

  // Validar PIN de seguridad (Tatiana: 7526197, Gabriela: 1010, Paola: 1212)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedPin = pinInput.trim();
    const user = getUserByPin(trimmedPin);

    if (user) {
      localStorage.setItem('auth_token_sistema_industrial', user.pin);
      setCurrentUser(user);
      setIsAuthenticated(true);
      setPinInput('');
    } else {
      setLoginError('Código de seguridad incorrecto. Verifique su PIN (Tatiana, Gabriela o Paola).');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token_sistema_industrial');
    setIsAuthenticated(false);
    setCurrentUser(null);
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
    } catch (err: any) {
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
      <div 
        className="relative flex items-center justify-center min-h-screen px-4 font-sans antialiased bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/banner_subestacion.png)' }}
      >
        {/* Overlay translúcido para apreciar el atardecer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#001e47]/75 via-[#002f6c]/60 to-slate-950/75 backdrop-blur-[1px]" />

        <div className="relative bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-blue-400/30 shadow-2xl max-w-md w-full text-center space-y-6 backdrop-blur-xl">
          
          {/* Logo oficial ENDE DEORURO */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="bg-white/95 p-3 rounded-2xl shadow-xl border border-white/60 inline-block">
              <img 
                src="/logo_ende_deoruro.png" 
                alt="ENDE DEORURO" 
                className="h-12 sm:h-14 w-auto object-contain"
              />
            </div>
            <div className="mt-2">
              <span className="text-[10px] font-black tracking-widest uppercase bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full border border-amber-400/40 inline-block">
                Seguridad Industrial y Salud Ocupacional
              </span>
              <h2 className="text-xl font-black text-white tracking-tight uppercase mt-2">
                Acceso al Sistema
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Seleccione su usuario o ingrese su PIN de acceso
              </p>
            </div>

            {/* Acceso Rápido por Colega con sus colores */}
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setPinInput('7526197')}
                className="text-[10px] font-extrabold px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/60 transition cursor-pointer shadow-sm flex items-center gap-1.5"
                title="PIN: 7526197"
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                <span>Tatiana Torres</span>
              </button>
              <button
                type="button"
                onClick={() => setPinInput('1010')}
                className="text-[10px] font-extrabold px-3 py-1.5 rounded-xl bg-orange-950/80 hover:bg-orange-900 text-orange-200 border border-orange-500/60 transition cursor-pointer shadow-sm flex items-center gap-1.5"
                title="PIN: 1010"
              >
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                <span>Gabriela</span>
              </button>
              <button
                type="button"
                onClick={() => setPinInput('1212')}
                className="text-[10px] font-extrabold px-3 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-200 border border-sky-500/60 transition cursor-pointer shadow-sm flex items-center gap-1.5"
                title="PIN: 1212"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                <span>Paola</span>
              </button>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-950/60 text-red-300 border border-red-800/80 rounded-xl p-3 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="password"
                placeholder="Ingrese su PIN de acceso..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-bold border border-slate-700 bg-slate-800/70 hover:bg-slate-800 rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition text-white placeholder:text-slate-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#003876] to-[#002f6c] hover:from-[#004b93] hover:to-[#003876] text-white font-black text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-950/50 transition border border-amber-400/40 cursor-pointer"
            >
              Ingresar al Sistema ENDE
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            <Link
              href="/registros"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#002f6c] to-[#003876] hover:from-[#003876] hover:to-[#004b93] text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition border border-white/10"
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>Registro de CITES (Clave: 1346)</span>
            </Link>
            <Link
              href="/formulario"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#002f6c] to-[#003876] hover:from-[#003876] hover:to-[#004b93] text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition border border-white/10"
            >
              <Wrench className="w-4 h-4 text-amber-300" />
              <span>Formulario Requerimiento Herramientas</span>
            </Link>
            <Link
              href="/tallas"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#002f6c] to-[#003876] hover:from-[#003876] hover:to-[#004b93] text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition border border-white/10"
            >
              <Footprints className="w-4 h-4 text-emerald-400" />
              <span>Formulario Tallas de Botines</span>
            </Link>
            <p className="text-[10px] text-slate-400 font-medium">
              Acceso institucional para personal técnico y jefatura
            </p>
          </div>

          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            ENDE DEORURO S.A. &copy; 2026
          </p>
        </div>
      </div>
    );
  }

  // Renderizar aplicación principal
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased">
      
      {/* Header Institucional ENDE DEORURO con Subestación Visible (Oculto en Impresión) */}
      <header className="relative bg-slate-950 text-white border-b-2 border-amber-400/70 shadow-xl overflow-hidden print:hidden">
        {/* Foto de fondo de subestación eléctrica nítida */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-85 scale-105 pointer-events-none"
          style={{ backgroundImage: 'url(/banner_subestacion.png)' }}
        />
        {/* Overlay sutil translúcido para apreciar la subestación y colores del atardecer */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#001e47]/65 via-[#002f6c]/50 to-[#001530]/65 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3.5 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-3">
              <div className="bg-white/95 p-2 sm:p-2.5 rounded-2xl shadow-lg border border-white/60 shrink-0">
                <img 
                  src="/logo_ende_deoruro.png" 
                  alt="ENDE DEORURO" 
                  className="h-9 sm:h-11 w-auto object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black tracking-widest uppercase bg-amber-400/25 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/40">
                    ENDE DEORURO
                  </span>
                  <span className="text-[9px] text-blue-100 font-bold uppercase tracking-wider hidden sm:inline drop-shadow-sm">
                    Filial de ENDE Corporación
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase mt-0.5 drop-shadow-md">
                  Seguridad Industrial y Salud Ocupacional
                </h1>
                <p className="text-[11px] text-blue-100 font-medium hidden sm:block drop-shadow-sm">
                  Control de EPP, Actas de Reunión, Herramientas, Extintores, Agua y Cronograma
                </p>
              </div>
            </div>

            {/* Badge de usuaria activa en vista móvil */}
            {currentUser && (
              <div className={`lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black shadow-sm ${
                currentUser.color === 'rose'
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                  : currentUser.color === 'sky'
                  ? 'bg-sky-950/80 border-sky-500/50 text-sky-200'
                  : currentUser.color === 'orange'
                  ? 'bg-orange-950/80 border-orange-500/50 text-orange-200'
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  currentUser.color === 'rose' ? 'bg-rose-400' :
                  currentUser.color === 'sky' ? 'bg-sky-400' :
                  currentUser.color === 'orange' ? 'bg-orange-400' : 'bg-amber-400'
                } animate-pulse`}></span>
                <span>{currentUser.shortName}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-semibold w-full lg:w-auto justify-end">
            <Link
              href="/registros"
              className="flex items-center gap-1.5 bg-[#003876]/80 hover:bg-[#004b93] text-white font-extrabold px-3 py-2 rounded-xl shadow-md transition border border-white/20 hover:border-amber-400/60"
              title="Abrir Registro de CITES con PIN 1346"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>CITES (1346)</span>
            </Link>

            <Link
              href="/formulario"
              className="flex items-center gap-1.5 bg-[#003876]/80 hover:bg-[#004b93] text-white font-extrabold px-3 py-2 rounded-xl shadow-md transition border border-white/20 hover:border-amber-400/60"
              title="Abrir Formulario de Requerimiento de Herramientas para Técnicos"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-300" />
              <span>Herramientas</span>
            </Link>

            <Link
              href="/tallas"
              className="flex items-center gap-1.5 bg-[#003876]/80 hover:bg-[#004b93] text-white font-extrabold px-3 py-2 rounded-xl shadow-md transition border border-white/20 hover:border-amber-400/60"
              title="Abrir Formulario de Registro de Tallas de Botines"
            >
              <Footprints className="w-3.5 h-3.5 text-emerald-300" />
              <span>Tallas Botines</span>
            </Link>

            {currentUser && (
              <div className={`hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black shadow-md ${
                currentUser.color === 'rose'
                  ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                  : currentUser.color === 'sky'
                  ? 'bg-sky-950/80 border-sky-500/50 text-sky-200'
                  : currentUser.color === 'orange'
                  ? 'bg-orange-950/80 border-orange-500/50 text-orange-200'
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-200'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  currentUser.color === 'rose' ? 'bg-rose-400' :
                  currentUser.color === 'sky' ? 'bg-sky-400' :
                  currentUser.color === 'orange' ? 'bg-orange-400' : 'bg-amber-400'
                } animate-pulse`}></span>
                <span>{currentUser.name}</span>
                <span className="text-[10px] font-normal opacity-80">({currentUser.shortName})</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 hover:border-red-400/60 px-3 py-2 rounded-xl transition cursor-pointer font-bold"
              title="Cerrar sesión / Cambiar de usuario"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cambiar</span>
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
          /* Vista de Impresión del Acta (Centrada y adaptada a la pantalla) */
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs flex gap-2 items-start print:hidden shadow-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Vista de Acta - Folio #{transactionData.folio}</p>
                <p className="mt-0.5">Puedes imprimir este comprobante en formato Carta pulsando **"Imprimir Acta"** o descargarlo en formato editable pulsando **"Exportar a Word (DOCX)"**.</p>
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
            
            {/* Título y Barra de Navegación del Dashboard ENDE DEORURO */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Módulo Activo
                  </span>
                </div>
                <h2 className="text-xl font-black text-[#002f6c] tracking-tight">
                  {tabTitles[activeTab]?.title || 'Panel de Salud y Seguridad Industrial'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {tabTitles[activeTab]?.subtitle || 'Gestión de dotaciones a personal nuevo, entregas, devoluciones, desuso y herramientas.'}
                </p>
              </div>

              {/* Botones de Pestañas Corporativas */}
              <div className="flex flex-wrap p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/90 w-full xl:w-auto gap-1 shadow-inner">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeTab === 'new' 
                      ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' 
                      : 'text-slate-700 hover:text-[#002f6c] hover:bg-white/80 font-bold'
                  }`}
                >
                  <PlusCircle className={`w-4 h-4 ${activeTab === 'new' ? 'text-amber-400' : 'text-blue-700'}`} />
                  <span>Registrar Acta</span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeTab === 'history' 
                      ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' 
                      : 'text-slate-700 hover:text-[#002f6c] hover:bg-white/80 font-bold'
                  }`}
                >
                  <History className={`w-4 h-4 ${activeTab === 'history' ? 'text-amber-400' : 'text-blue-700'}`} />
                  <span>Historial Actas</span>
                </button>
                <button
                  onClick={() => setActiveTab('toolRequests')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeTab === 'toolRequests' 
                      ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' 
                      : 'text-slate-700 hover:text-[#002f6c] hover:bg-white/80 font-bold'
                  }`}
                >
                  <Wrench className={`w-4 h-4 ${activeTab === 'toolRequests' ? 'text-amber-400' : 'text-blue-700'}`} />
                  <span>Herramientas</span>
                </button>
                <button
                  onClick={() => setActiveTab('bootSizeRequests')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeTab === 'bootSizeRequests' 
                      ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' 
                      : 'text-slate-700 hover:text-[#002f6c] hover:bg-white/80 font-bold'
                  }`}
                >
                  <Footprints className={`w-4 h-4 ${activeTab === 'bootSizeRequests' ? 'text-amber-400' : 'text-blue-700'}`} />
                  <span>Tallas Botines</span>
                </button>
                <button
                  onClick={() => setActiveTab('extinguishers')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeTab === 'extinguishers' 
                      ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' 
                      : 'text-slate-700 hover:text-[#002f6c] hover:bg-white/80 font-bold'
                  }`}
                >
                  <Flame className={`w-4 h-4 ${activeTab === 'extinguishers' ? 'text-amber-400' : 'text-rose-600'}`} />
                  <span>Extintores</span>
                </button>
                <button
                  onClick={() => setActiveTab('waterSupply')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeTab === 'waterSupply' 
                      ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' 
                      : 'text-slate-700 hover:text-[#002f6c] hover:bg-white/80 font-bold'
                  }`}
                >
                  <Droplets className={`w-4 h-4 ${activeTab === 'waterSupply' ? 'text-amber-400' : 'text-sky-600'}`} />
                  <span>Control de Agua</span>
                </button>
                <button
                  onClick={() => setActiveTab('cites')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeTab === 'cites' 
                      ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' 
                      : 'text-slate-700 hover:text-[#002f6c] hover:bg-white/80 font-bold'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${activeTab === 'cites' ? 'text-amber-400' : 'text-blue-700'}`} />
                  <span>CITES</span>
                </button>
                <button
                  onClick={() => setActiveTab('medicineKits')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeTab === 'medicineKits' 
                      ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' 
                      : 'text-slate-700 hover:text-[#002f6c] hover:bg-white/80 font-bold'
                  }`}
                >
                  <HeartPulse className={`w-4 h-4 ${activeTab === 'medicineKits' ? 'text-amber-400' : 'text-rose-600'}`} />
                  <span>Medicamentos</span>
                </button>
                <button
                  onClick={() => setActiveTab('notices')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeTab === 'notices' 
                      ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' 
                      : 'text-slate-700 hover:text-[#002f6c] hover:bg-white/80 font-bold'
                  }`}
                >
                  <CalendarDays className={`w-4 h-4 ${activeTab === 'notices' ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span>Cronograma y Avisos</span>
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
              </div>
            ) : activeTab === 'toolRequests' ? (
              /* CONTENIDO DE PESTAÑA: REQUERIMIENTOS DE HERRAMIENTAS (HISTORIAL Y CONTROL) */
              <FormularioHerramientas showTabs={false} initialTab="history" />
            ) : activeTab === 'bootSizeRequests' ? (
              /* CONTENIDO DE PESTAÑA: REGISTRO DE TALLAS DE BOTINES (HISTORIAL Y CONSOLIDADO) */
              <FormularioTallasBotines showTabs={false} initialTab="history" />
            ) : activeTab === 'extinguishers' ? (
              /* CONTENIDO DE PESTAÑA: CONTROL DE EXTINTORES */
              <ModuloExtintores showTabs={false} />
            ) : activeTab === 'waterSupply' ? (
              /* CONTENIDO DE PESTAÑA: CONTROL DE SUMINISTRO DE AGUA */
              <ModuloControlAgua showTabs={false} />
            ) : activeTab === 'cites' ? (
              /* CONTENIDO DE PESTAÑA: CITES A GERENCIA */
              <ModuloCites showTabs={false} />
            ) : activeTab === 'medicineKits' ? (
              /* CONTENIDO DE PESTAÑA: KITS DE MEDICAMENTOS */
              <ModuloMedicamentosKits showTabs={false} />
            ) : (
              /* CONTENIDO DE PESTAÑA: CRONOGRAMA Y AVISOS */
              <ModuloAvisosCronograma />
            )}

          </div>
        )}
      </main>

      {/* Footer (Oculto en Impresión) */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-semibold print:hidden mt-auto">
        <p>Sistema de Seguridad Industrial - ENDE ORURO © {new Date().getFullYear()}</p>
      </footer>

      {/* Burbuja Flotante de Chat Interno (Tatiana • Gabriela • Paola) */}
      <FloatingTeamChat currentUser={currentUser} />
    </div>
  );
}
