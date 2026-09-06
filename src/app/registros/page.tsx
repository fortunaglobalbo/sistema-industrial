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
      <div 
        className="min-h-screen relative flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 font-sans bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/banner_subestacion.png)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-[#001e47]/95 via-[#002f6c]/90 to-slate-950/95 backdrop-blur-[2px]" />
        
        <div className="relative max-w-md w-full bg-slate-900/90 border border-blue-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          
          <div className="text-center space-y-3">
            <div className="inline-block bg-white/95 p-2.5 rounded-2xl shadow-lg border border-white/60">
              <img 
                src="/logo_ende_deoruro.png" 
                alt="ENDE DEORURO" 
                className="h-12 w-auto object-contain"
              />
            </div>
            
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/40 font-mono inline-block">
                ENDE DEORURO - CITES A GERENCIA
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1.5">
                Libro de CITES Oficiales
              </h1>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Ingrese el PIN de autorización para registrar y gestionar correspondencia oficial
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase text-slate-300">
                Clave de Acceso (PIN):
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-amber-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  maxLength={10}
                  required
                  autoFocus
                  placeholder="Ingrese PIN (1346)..."
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full bg-slate-950/80 border-2 border-slate-700 focus:border-amber-400 rounded-2xl pl-12 pr-4 py-3.5 text-center text-lg font-black tracking-widest text-white focus:outline-none transition shadow-inner placeholder:text-slate-500"
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
              className="w-full bg-gradient-to-r from-[#003876] to-[#002f6c] hover:from-[#004b93] hover:to-[#003876] text-white font-black py-3.5 px-6 rounded-2xl transition shadow-lg shadow-blue-950/40 text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-amber-400/40 cursor-pointer"
            >
              <span>Ingresar al Registro de CITES</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-800">
            <p className="text-[11px] text-slate-400">
              Uso exclusivo para correspondencia y CITES a Gerencia - ENDE DEORURO
            </p>
          </div>

        </div>

      </div>
    );
  }

  // PANTALLA PRINCIPAL EXCLUSIVA PARA CITES (PORTAL /REGISTROS)
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-12">
      
      {/* BARRA SUPERIOR INSTITUCIONAL ENDE DEORURO */}
      <header className="relative bg-slate-950 text-white shadow-xl sticky top-0 z-30 border-b-2 border-amber-400/70 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35 scale-105 pointer-events-none"
          style={{ backgroundImage: 'url(/banner_subestacion.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#001e47]/95 via-[#002f6c]/90 to-[#001530]/95 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex justify-between items-center">
          
          <div className="flex items-center gap-3.5">
            <div className="bg-white/95 p-2 rounded-xl shadow-md border border-white/60">
              <img 
                src="/logo_ende_deoruro.png" 
                alt="ENDE DEORURO" 
                className="h-9 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                  Libro y Registro de CITES Oficiales
                </h1>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                  PIN 1346
                </span>
              </div>
              <p className="text-[11px] text-blue-200/90 font-medium hidden sm:block">
                ENDE DEORURO &bull; Sistema de Seguridad Industrial y Salud Ocupacional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="flex items-center gap-1 bg-[#003876]/80 hover:bg-[#004b93] text-white px-3 py-2 rounded-xl text-xs font-bold transition border border-white/20"
            >
              <span>Volver al Menú Principal</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/70 text-red-300 px-3 py-2 rounded-xl text-xs font-bold transition border border-red-500/30"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
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
