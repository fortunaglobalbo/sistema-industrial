'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, Lock, KeyRound, LogOut, PlusCircle, 
  FileText, Droplets, Flame, Footprints, Wrench, 
  Sparkles, CheckCircle2, UserCheck, ArrowRight, BookOpen, HeartPulse
} from 'lucide-react';
import TransactionForm from '@/components/TransactionForm';
import ModuloCites from '@/components/ModuloCites';
import ModuloExtintores from '@/components/ModuloExtintores';
import ModuloControlAgua from '@/components/ModuloControlAgua';
import FormularioTallasBotines from '@/components/FormularioTallasBotines';
import FormularioHerramientas from '@/components/FormularioHerramientas';
import PrintReceipt from '@/components/PrintReceipt';
import { getTransactionDetails } from '@/app/actions/transaction';
import Swal from 'sweetalert2';

export default function RegistrosColegaPage() {
  // Estado de Autenticación con Clave para Colega (1346)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Módulos de Registro: 'actas' | 'cites' | 'extintores' | 'agua' | 'tallas' | 'herramientas'
  const [activeModule, setActiveModule] = useState<'actas' | 'cites' | 'extintores' | 'agua' | 'tallas' | 'herramientas'>('actas');

  // Previsualización e Impresión de Acta tras registrar
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<any | null>(null);
  const [itemsData, setItemsData] = useState<any[]>([]);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token_registros_colega');
    if (savedToken === '1346' || savedToken === '7526197') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Acepta la clave solicitada 1346 o la clave maestra
    if (pinInput === '1346' || pinInput === '7526197') {
      localStorage.setItem('auth_token_registros_colega', pinInput);
      setIsAuthenticated(true);
      setPinInput('');
    } else {
      setLoginError('Clave de acceso incorrecta. Verifique con el encargado de Seguridad Industrial.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token_registros_colega');
    setIsAuthenticated(false);
    setActiveTransactionId(null);
    setTransactionData(null);
    setItemsData([]);
  };

  // Cargar detalles de un acta generada
  const handleTransactionCreated = async (transactionId: string) => {
    try {
      const res = await getTransactionDetails(transactionId);
      if (res.success && res.transaction) {
        setTransactionData(res.transaction);
        setItemsData(res.items || []);
        setActiveTransactionId(transactionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Estado de carga inicial
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // PANTALLA DE BLOQUEO / INGRESO DE CLAVE (1346)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 font-sans">
        
        <div className="max-w-md w-full bg-slate-900/90 border-2 border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-600/20 text-indigo-400 rounded-3xl border border-indigo-500/30 shadow-inner">
              <KeyRound className="w-10 h-10" />
            </div>
            
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 font-mono">
                ENDE DEORURO - SEGURIDAD INDUSTRIAL
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                Portal de Registros
              </h1>
              <p className="text-xs text-slate-400 font-bold mt-1">
                Ingrese la clave de autorización para registrar datos
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase text-slate-300">
                Clave de Acceso (PIN):
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  maxLength={10}
                  required
                  autoFocus
                  placeholder="Ingrese el PIN (Ej. 1346)..."
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl pl-12 pr-4 py-3.5 text-center text-lg font-black tracking-widest text-white focus:outline-none transition shadow-inner"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-300 text-xs font-bold text-center animate-shake">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black py-3.5 px-6 rounded-2xl transition shadow-lg shadow-indigo-600/30 text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Ingresar al Formulario</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-800">
            <p className="text-[11px] text-slate-500">
              Uso exclusivo para personal autorizado de ENDE Oruro
            </p>
          </div>

        </div>

      </div>
    );
  }

  // PANTALLA PRINCIPAL DE FORMULARIO DE REGISTROS PARA COLEGA
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-12">
      
      {/* BARRA SUPERIOR DE NAVEGACIÓN */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <img 
              src="/logo-ende.png" 
              alt="ENDE DEORURO" 
              className="h-9 w-auto object-contain bg-white/10 p-1 rounded-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                  Portal de Registros
                </h1>
                <span className="bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  CLAVE 1346
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold hidden sm:block">
                Ingreso y registro ágil de actas, dotaciones, CITES y suministros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-600/90 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>

        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* SELECTOR DE PESTAÑAS DE REGISTRO */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1.5 sm:gap-2">
          
          <button
            onClick={() => {
              setActiveModule('actas');
              setActiveTransactionId(null);
            }}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase transition ${
              activeModule === 'actas'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>1. Acta EPP / Botiquín</span>
          </button>

          <button
            onClick={() => setActiveModule('cites')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase transition ${
              activeModule === 'cites'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. CITES a Gerencia</span>
          </button>

          <button
            onClick={() => setActiveModule('extintores')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase transition ${
              activeModule === 'extintores'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>3. Extintores</span>
          </button>

          <button
            onClick={() => setActiveModule('agua')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase transition ${
              activeModule === 'agua'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>4. Control de Agua</span>
          </button>

          <button
            onClick={() => setActiveModule('tallas')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase transition ${
              activeModule === 'tallas'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>5. Tallas Botines</span>
          </button>

          <button
            onClick={() => setActiveModule('herramientas')}
            className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase transition ${
              activeModule === 'herramientas'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>6. Herramientas</span>
          </button>

        </div>

        {/* CONTENIDO DEL FORMULARIO SELECCIONADO */}
        <div className="transition-all duration-200">
          
          {/* MÓDULO 1: REGISTRAR ACTA EPP / INSUMOS / BOTIQUÍN */}
          {activeModule === 'actas' && (
            <div>
              {activeTransactionId && transactionData ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-black text-emerald-950 uppercase flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Acta Registrada con Éxito (#{transactionData.correlative_number || activeTransactionId})
                    </span>
                    <button
                      onClick={() => {
                        setActiveTransactionId(null);
                        setTransactionData(null);
                      }}
                      className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-blue-700 transition"
                    >
                      + Registrar Otra Acta
                    </button>
                  </div>
                  <PrintReceipt 
                    transaction={transactionData}
                    items={itemsData}
                    onBack={() => {
                      setActiveTransactionId(null);
                      setTransactionData(null);
                    }}
                  />
                </div>
              ) : (
                <TransactionForm onSuccess={handleTransactionCreated} />
              )}
            </div>
          )}

          {/* MÓDULO 2: CITES A GERENCIA */}
          {activeModule === 'cites' && (
            <ModuloCites showTabs={false} />
          )}

          {/* MÓDULO 3: EXTINTORES */}
          {activeModule === 'extintores' && (
            <ModuloExtintores showTabs={false} />
          )}

          {/* MÓDULO 4: CONTROL DE AGUA */}
          {activeModule === 'agua' && (
            <ModuloControlAgua showTabs={false} />
          )}

          {/* MÓDULO 5: TALLAS DE BOTINES */}
          {activeModule === 'tallas' && (
            <FormularioTallasBotines />
          )}

          {/* MÓDULO 6: HERRAMIENTAS */}
          {activeModule === 'herramientas' && (
            <FormularioHerramientas />
          )}

        </div>

      </main>

    </div>
  );
}
