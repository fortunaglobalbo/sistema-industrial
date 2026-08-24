'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, KeyRound, LogOut, FileText, 
  ArrowRight, BookOpen, ShieldCheck, CheckCircle2
} from 'lucide-react';
import ModuloCites from '@/components/ModuloCites';

export default function RegistrosCitePage() {
  // Estado de Autenticación con Clave para Colega (1346)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token_registros_cite');
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
      localStorage.setItem('auth_token_registros_cite', pinInput);
      setIsAuthenticated(true);
      setPinInput('');
    } else {
      setLoginError('Clave de acceso incorrecta. Ingrese el PIN asignado (Ej. 1346).');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token_registros_cite');
    setIsAuthenticated(false);
  };

  // Estado de carga inicial
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
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
              <FileText className="w-10 h-10" />
            </div>
            
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 font-mono">
                ENDE DEORURO - SEGURIDAD INDUSTRIAL
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                Registro de CITES Oficiales
              </h1>
              <p className="text-xs text-slate-400 font-bold mt-1">
                Ingrese la clave de autorización para registrar y gestionar CITES
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
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-300 text-xs font-bold text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black py-3.5 px-6 rounded-2xl transition shadow-lg shadow-indigo-600/30 text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Ingresar al Registro de CITES</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-800">
            <p className="text-[11px] text-slate-500">
              Uso exclusivo para registro de correspondencia y CITES a Gerencia
            </p>
          </div>

        </div>

      </div>
    );
  }

  // PANTALLA PRINCIPAL EXCLUSIVA PARA CITES (PORTAL /REGISTROS)
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-12">
      
      {/* BARRA SUPERIOR INSTITUCIONAL */}
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
                  Libro y Registro de CITES
                </h1>
                <span className="bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  CLAVE 1346
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold hidden sm:block">
                Registro de correspondencia oficial, informes y notas a Gerencia
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

      {/* CONTENIDO PRINCIPAL: EXCLUSIVAMENTE MÓDULO DE CITES */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ModuloCites showTabs={false} />
      </main>

    </div>
  );
}
