'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ActasModule from '@/components/ActasModule';
import { 
  Loader2, 
  Lock, KeyRound, LogOut, History, PlusCircle, Wrench, Footprints, Flame, Droplets, FileText, HeartPulse, CalendarDays
} from 'lucide-react';
import FormularioHerramientas from '@/components/FormularioHerramientas';
import FormularioTallasBotines from '@/components/FormularioTallasBotines';
import ModuloExtintores from '@/components/ModuloExtintores';
import ModuloControlAgua from '@/components/ModuloControlAgua';
import ModuloCites from '@/components/ModuloCites';
import ModuloMedicamentosKits from '@/components/ModuloMedicamentosKits';
import ModuloAvisosCronograma from '@/components/ModuloAvisosCronograma';
import FloatingTeamChat from '@/components/FloatingTeamChat';
import { TEAM_USERS, getUserByPin, TeamUser } from '@/lib/teamAuth';

export default function Home() {
  // Estados de Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<TeamUser | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'toolRequests' | 'bootSizeRequests' | 'extinguishers' | 'waterSupply' | 'cites' | 'medicineKits' | 'notices'>('new');
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
      title: 'Control y Suministro de Agua (Aquavel 20L)',
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
            <Link href="/historiales" className="w-full flex items-center justify-center gap-2 bg-[#003876] hover:bg-[#00458f] text-white font-extrabold text-xs py-2.5 px-4 rounded-xl border border-amber-400/30">
              <HeartPulse className="w-4 h-4 text-amber-400" />
              <span>Salud ocupacional · Historias clínicas</span>
            </Link>
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
          {/* Dashboard Principal con Tabulación */}
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
            {activeTab === 'new' || activeTab === 'history' ? (
              <ActasModule key={activeTab} activeTab={activeTab} onTabChange={setActiveTab} />
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
