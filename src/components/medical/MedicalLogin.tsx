"use client";
import { useActionState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Stethoscope,
  ShieldCheck,
} from "lucide-react";
import { loginMedical } from "@/app/historiales/actions";

export default function MedicalLogin() {
  const [state, action, pending] = useActionState(loginMedical, { error: "" });
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white">
      <section className="bg-[#082b36] text-white p-8 lg:p-16 flex flex-col justify-between gap-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-teal-100"
        >
          <ArrowLeft size={16} /> Sistema industrial
        </Link>
        <div className="max-w-lg">
          <div className="mb-8 h-16 w-16 rounded-2xl bg-teal-300/10 grid place-items-center">
            <Stethoscope size={32} className="text-teal-200" />
          </div>
          <p className="text-teal-200 uppercase tracking-[.2em] text-xs font-semibold mb-5">
            Salud ocupacional
          </p>
          <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">
            Un espacio para cuidar a nuestro equipo.
          </h1>
          <p className="text-slate-300 mt-6 text-lg leading-relaxed">
            Historias clínicas, consultas y seguimiento del trabajador, en un
            solo lugar.
          </p>
        </div>
        <p className="flex items-center gap-3 text-sm text-teal-100">
          <ShieldCheck size={20} /> Información clínica de acceso restringido
        </p>
      </section>
      <section className="p-8 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <LockKeyhole className="text-teal-700 mb-6" size={28} />
          <h2 className="text-3xl font-semibold">Bienvenida</h2>
          <p className="text-slate-500 mt-3 mb-8">
            Ingresa tu código para continuar.
          </p>
          <form action={action} className="space-y-5">
            <label className="block text-sm font-medium">
              Código de acceso
              <input
                name="code"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                autoComplete="off"
                required
                minLength={4}
                maxLength={4}
                placeholder="••••"
                aria-describedby="medical-code-help"
                className="mt-2 w-full rounded-xl border border-slate-300 p-4 text-center text-2xl tracking-[.45em] outline-teal-700"
              />
            </label>
            {state.error && (
              <p
                role="alert"
                className="p-3 rounded-xl bg-red-50 text-red-800 text-sm"
              >
                {state.error}
              </p>
            )}
            <button
              disabled={pending}
              className="w-full rounded-xl bg-teal-800 text-white p-3 font-semibold flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {pending ? "Verificando acceso…" : "Ingresar al espacio médico"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p id="medical-code-help" className="text-xs leading-relaxed text-slate-500 mt-6">
            Código personal de cuatro dígitos. Si necesitas ayuda para ingresar,
            contacta al responsable del sistema.
          </p>
        </div>
      </section>
    </main>
  );
}
