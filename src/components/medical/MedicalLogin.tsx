"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { loginMedical } from "@/app/historiales/actions";

export default function MedicalLogin() {
  const [state, action, pending] = useActionState(loginMedical, {error:""});
  return <main className="relative min-h-screen flex items-center justify-center bg-slate-950 p-4">
    <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:'url(/banner_subestacion.png)'}}/>
    <div className="absolute inset-0 bg-gradient-to-br from-[#001e47]/90 via-slate-950/80 to-[#002f6c]/90"/>
    <section className="relative bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-blue-400/30 shadow-2xl max-w-md w-full text-center space-y-6 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-3">
        <div className="bg-white/95 p-3 rounded-2xl shadow-xl border border-white/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_ende_deoruro.png" alt="ENDE DEORURO" className="h-14 w-auto object-contain"/>
        </div>
        <span className="text-[10px] font-black tracking-widest uppercase bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full border border-amber-400/40">Seguridad Industrial y Salud Ocupacional</span>
        <div><h1 className="text-xl font-black text-white tracking-tight uppercase">Acceso al espacio médico</h1><p className="text-xs text-slate-300 font-medium mt-2">Ingresa tu código para continuar.</p></div>
      </div>
      <form action={action} className="space-y-4">
        <label htmlFor="medical-code" className="block text-xs font-bold text-slate-300 text-left">Código de acceso</label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400"/>
          <input id="medical-code" name="code" type="password" inputMode="numeric" pattern="[0-9]{4}" autoComplete="off" required minLength={4} maxLength={4} placeholder="Ingrese su PIN de acceso..." aria-describedby="medical-code-help" className="w-full text-center tracking-widest text-lg font-bold border border-slate-700 bg-slate-800/70 rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 text-white placeholder:text-slate-400"/>
        </div>
        {state.error && <p role="alert" className="bg-red-950/60 text-red-200 border border-red-800 rounded-xl p-3 text-xs font-semibold">{state.error}</p>}
        <button disabled={pending} className="w-full bg-gradient-to-r from-[#003876] to-[#002f6c] hover:from-[#004b93] hover:to-[#003876] text-white font-black text-sm py-3 px-4 rounded-xl shadow-lg border border-amber-400/40 disabled:opacity-50 cursor-pointer">{pending ? "Verificando acceso…" : "Ingresar al Sistema ENDE"}</button>
      </form>
      <div className="pt-4 border-t border-slate-800 space-y-4">
        <p id="medical-code-help" className="text-xs text-slate-300 flex items-center justify-center gap-2"><ShieldCheck size={16} className="text-amber-400"/> Historias clínicas de acceso restringido</p>
        <Link href="/" className="flex items-center justify-center gap-2 text-xs font-extrabold text-blue-100 hover:text-white"><ArrowLeft size={14}/> Volver al sistema principal</Link>
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ENDE DEORURO S.A. &copy; 2026</p>
    </section>
  </main>;
}
