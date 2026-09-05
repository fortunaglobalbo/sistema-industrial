'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Client Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-800">
            Novedad al cargar el módulo
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ocurrió un inconveniente temporal al sincronizar con los servicios en la nube.
          </p>
          {error?.message && (
            <div className="bg-slate-100 p-2.5 rounded-xl text-[11px] font-mono text-slate-700 text-left overflow-x-auto max-h-32 border border-slate-200">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
