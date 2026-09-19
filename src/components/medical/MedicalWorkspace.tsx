"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  ClipboardList,
  FileHeart,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  getMedicalShared,
  logoutMedical,
  readMedicalCase,
  readSharedAct,
  searchMedicalWorkers,
  saveMedicalEncounter,
} from "@/app/historiales/actions";
import type {
  Encounter,
  MedicalCase,
  MedicalWorker,
  SharedData,
} from "@/lib/medical/types";
import EncounterForm, { clinicalFields } from "./EncounterForm";
import PrintReceipt from "@/components/PrintReceipt";
import "./medical.css";

type Tab = "inicio" | "trabajadores" | "actas" | "botiquin";
const navigation = [
  { id: "inicio", label: "Inicio", icon: LayoutDashboard },
  { id: "trabajadores", label: "Historias clínicas", icon: FileHeart },
  { id: "actas", label: "Actas de dotación", icon: ClipboardList },
  { id: "botiquin", label: "Botiquín", icon: HeartPulse },
] as const;
const date = (value: string) =>
  new Date(value).toLocaleString("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  });

const liveApi = {
  searchMedicalWorkers,
  readMedicalCase,
  getMedicalShared,
  readSharedAct,
  saveMedicalEncounter,
  logoutMedical,
};
export type MedicalApi = Omit<typeof liveApi, 'logoutMedical'> & { logoutMedical: () => Promise<void> };
export default function MedicalWorkspace({
  doctor,
  api = liveApi,
}: {
  doctor: string;
  api?: MedicalApi;
}) {
  const [tab, setTab] = useState<Tab>("inicio");
  const [workers, setWorkers] = useState<MedicalWorker[]>([]);
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState<MedicalCase>();
  const [shared, setShared] = useState<SharedData>();
  const [form, setForm] = useState(false);
  const [correction, setCorrection] = useState<Encounter>();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [printed, setPrinted] = useState<Encounter>();
  const [act, setAct] = useState<Awaited<ReturnType<typeof readSharedAct>>>();
  const sequence = useRef(0);
  useEffect(() => {
    let alive = true;
    api
      .searchMedicalWorkers("")
      .then((rows) => {
        if (alive) setWorkers(rows);
      })
      .catch(() => {
        if (alive)
          setError("No se pudo cargar el padrón. Usa Buscar para reintentar.");
      });
    return () => {
      alive = false;
    };
  }, [api]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    if (!printed) return;
    const clear = () => setPrinted(undefined);
    window.addEventListener("afterprint", clear);
    const timer = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", clear);
    };
  }, [printed]);
  function leave() {
    if (saving) return false;
    return (
      !dirty ||
      window.confirm("Hay una atención sin guardar. ¿Descartar los cambios?")
    );
  }
  async function openPatient(workerId: string) {
    if (!leave()) return;
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    setPatient(undefined);
    setForm(false);
    setDirty(false);
    setCorrection(undefined);
    setTab("trabajadores");
    try {
      const value = await api.readMedicalCase(workerId);
      if (id === sequence.current) setPatient(value);
    } catch (e) {
      if (id === sequence.current)
        setError(
          e instanceof Error ? e.message : "No se pudo abrir el expediente.",
        );
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  async function navigate(next: Tab) {
    if (busy || !leave()) return;
    ++sequence.current;
    setTab(next);
    setPatient(undefined);
    setForm(false);
    setDirty(false);
    setAct(undefined);
    setError("");
    setNotice("");
    if (next === "actas" || next === "botiquin") {
      setBusy(true);
      setShared(undefined);
      try {
        setShared(await api.getMedicalShared());
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "No se pudieron cargar los datos.",
        );
      } finally {
        setBusy(false);
      }
    }
  }
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setWorkers(await api.searchMedicalWorkers(query));
    } catch {
      setError("No se pudo buscar. Revisa tu conexión y sesión.");
    } finally {
      setBusy(false);
    }
  }
  const title = patient
    ? "Expediente del trabajador"
    : navigation.find((n) => n.id === tab)?.label;
  return (
    <div className="medical-shell min-h-screen bg-[#f4f7f8] text-slate-800 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="bg-[#082b36] text-white p-6 lg:min-h-screen flex flex-col print:hidden">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl bg-teal-300/15 p-2.5">
            <Stethoscope className="text-teal-200" />
          </div>
          <div>
            <p className="font-semibold">Salud ocupacional</p>
            <p className="text-xs text-slate-400 mt-1">Sistema industrial</p>
          </div>
        </div>
        <p className="text-[10px] tracking-[.2em] text-slate-400 uppercase mb-3">
          Espacio médico
        </p>
        <nav className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              disabled={busy}
              onClick={() => navigate(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`text-left rounded-xl p-3 flex items-center gap-3 text-sm transition ${tab === id ? "bg-teal-300/15 text-teal-100" : "text-slate-300 hover:bg-white/5"} disabled:opacity-50`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-10">
          <div className="border border-white/10 rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
            <ShieldCheck size={20} className="mb-2 text-teal-300" />
            Las historias clínicas están disponibles solo para personal médico
            autorizado.
          </div>
          <Link
            href="/"
            onClick={(e) => {
              if (!leave()) e.preventDefault();
            }}
            className="flex gap-2 items-center text-xs text-slate-400 mt-6"
          >
            <ArrowLeft size={14} /> Volver al sistema principal
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-5 flex justify-between gap-4 items-center print:hidden">
          <p className="text-sm text-slate-500">
            Salud ocupacional <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-800">{title}</span>
          </p>
          <form
            action={api.logoutMedical}
            onSubmit={(e) => {
              if (busy || !leave()) e.preventDefault();
            }}
            className="flex items-center gap-3"
          >
            <span className="text-sm font-medium hidden sm:block">
              {doctor}
            </span>
            <button
              disabled={busy}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <LogOut size={18} />
            </button>
          </form>
        </header>
        <main className="p-5 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-800"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="bg-teal-50 rounded-xl p-4 text-teal-800"
            >
              {notice}
            </div>
          )}
          {busy && (
            <p role="status" className="text-sm text-teal-800">
              Cargando registros…
            </p>
          )}
          {tab === "inicio" && (
            <>
              <div className="flex flex-wrap justify-between items-end gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-teal-700 mb-2">
                    Atención y seguimiento
                  </p>
                  <h1 className="text-3xl font-semibold">
                    Bienvenida, {doctor}
                  </h1>
                  <p className="text-slate-500 mt-3">
                    El cuidado del trabajador empieza con su historia.
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {new Date().toLocaleDateString("es-BO", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <section className="rounded-2xl bg-[#e1efec] p-7 md:p-9 flex flex-wrap justify-between items-center gap-6">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-4">
                    <Activity size={16} /> Consulta médica
                  </div>
                  <h2 className="text-2xl font-semibold text-[#163f42]">
                    Cada atención, parte de una misma historia.
                  </h2>
                  <p className="text-slate-600 mt-3 mb-6">
                    Busca al trabajador para consultar sus antecedentes o
                    registrar una nueva atención.
                  </p>
                  <button
                    onClick={() => navigate("trabajadores")}
                    className="medical-primary"
                  >
                    <Plus size={18} /> Registrar atención
                  </button>
                </div>
                <FileHeart
                  size={100}
                  strokeWidth={1}
                  className="text-teal-700/50 hidden md:block"
                />
              </section>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    id: "trabajadores" as const,
                    title: "Expedientes clínicos",
                    text: "Antecedentes y consultas en orden cronológico.",
                    icon: Users,
                  },
                  {
                    id: "actas" as const,
                    title: "Actas de dotación",
                    text: "Consulta las entregas del sistema industrial.",
                    icon: ClipboardList,
                  },
                  {
                    id: "botiquin" as const,
                    title: "Botiquines compartidos",
                    text: "Revisa la composición de los kits registrados.",
                    icon: HeartPulse,
                  },
                ].map(({ id, title, text, icon: Icon }) => (
                  <button
                    key={id}
                    disabled={busy}
                    onClick={() => navigate(id)}
                    className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-teal-400 transition"
                  >
                    <div className="flex justify-between mb-6">
                      <Icon className="text-teal-700" size={24} />
                      <ArrowUpRight size={17} className="text-slate-400" />
                    </div>
                    <h3 className="font-semibold mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {text}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <ShieldCheck size={15} /> Cada apertura de expediente y atención
                guardada queda registrada.
              </p>
            </>
          )}
          {tab === "trabajadores" && !patient && (
            <>
              <div>
                <h1 className="text-3xl font-semibold">Historias clínicas</h1>
                <p className="mt-2 text-slate-500">
                  Selecciona un trabajador del padrón compartido.
                </p>
              </div>
              <form onSubmit={search} className="flex gap-3">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="absolute left-4 top-4 text-slate-400"
                  />
                  <input
                    aria-label="Buscar por nombre o CI"
                    value={query}
                    maxLength={100}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre o cédula de identidad…"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 outline-teal-700"
                  />
                </div>
                <button disabled={busy} className="medical-primary">
                  Buscar
                </button>
              </form>
              <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between">
                  <h2 className="font-semibold">Trabajadores</h2>
                  <span className="text-xs text-slate-500">
                    Hasta 50 resultados · afina la búsqueda
                  </span>
                </div>
                {workers.length === 0 ? (
                  <p className="p-8 text-slate-500">
                    No hay resultados. Prueba con otro nombre o CI. Los
                    trabajadores nuevos se registran en el padrón del sistema
                    principal.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {workers.map((worker) => (
                      <button
                        key={worker.id}
                        disabled={busy}
                        onClick={() => openPatient(worker.id)}
                        className="w-full text-left p-5 hover:bg-teal-50/50 flex justify-between items-center gap-4"
                      >
                        <div>
                          <p className="font-medium">{worker.full_name}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            CI {worker.ci} · {worker.position} ·{" "}
                            {worker.department}
                          </p>
                        </div>
                        <span className="text-teal-700 text-sm flex items-center gap-2 shrink-0">
                          Abrir <ArrowUpRight size={16} />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
          {patient && (
            <>
              <button
                disabled={busy}
                onClick={() => navigate("trabajadores")}
                className="flex items-center gap-2 text-sm text-slate-500"
              >
                <ArrowLeft size={16} /> Todos los trabajadores
              </button>
              <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap gap-5 justify-between items-center">
                <div>
                  <p className="text-xs uppercase tracking-widest text-teal-700 mb-2">
                    Expediente clínico
                  </p>
                  <h1 className="text-2xl font-semibold">
                    {patient.worker.full_name}
                  </h1>
                  <p className="text-sm text-slate-500 mt-2">
                    CI {patient.worker.ci} · {patient.worker.position} ·{" "}
                    {patient.worker.department}
                  </p>
                </div>
                {!form && (
                  <button
                    className="medical-primary"
                    onClick={() => {
                      setCorrection(undefined);
                      setForm(true);
                      setNotice("");
                    }}
                  >
                    <Plus size={18} /> Nueva atención
                  </button>
                )}
              </section>
              {form ? (
                <EncounterForm
                  onSavingChange={setSaving}
                  save={api.saveMedicalEncounter}
                  key={correction?.id || patient.worker.id}
                  workerId={patient.worker.id}
                  correction={correction}
                  onDirty={() => setDirty(true)}
                  onClose={() => {
                    if (leave()) {
                      setForm(false);
                      setDirty(false);
                    }
                  }}
                  onSaved={() => {
                    setDirty(false);
                    setForm(false);
                    setNotice("Atención guardada correctamente.");
                    setBusy(true);
                    api
                      .readMedicalCase(patient.worker.id)
                      .then(setPatient)
                      .catch(() =>
                        setError(
                          "La atención se guardó, pero no se pudo actualizar la lista. Vuelve a abrir el expediente.",
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                />
              ) : (
                <section>
                  <div className="flex justify-between mb-4">
                    <h2 className="font-semibold">Historial de atenciones</h2>
                    <span className="text-sm text-slate-500">
                      {patient.encounters.length} registros
                    </span>
                  </div>
                  {patient.encounters.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                      <FileHeart
                        className="mx-auto text-teal-600 mb-4"
                        size={32}
                      />
                      <h3 className="font-semibold">
                        El expediente está listo para su primera atención
                      </h3>
                      <p className="text-sm text-slate-500 mt-2">
                        Registra los antecedentes y el motivo de consulta para
                        comenzar.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {patient.encounters.map((entry) => (
                        <article
                          key={entry.id}
                          className="bg-white rounded-2xl border border-slate-200 p-6"
                        >
                          <div className="flex flex-wrap justify-between gap-3">
                            <div>
                              <span className="text-xs rounded-full bg-teal-50 text-teal-800 px-3 py-1">
                                {entry.data.correctionOf
                                  ? "Corrección"
                                  : entry.data.kind === "consulta"
                                    ? "Consulta"
                                    : "Reconsulta"}
                              </span>
                              <h3 className="font-semibold text-lg mt-3">
                                {entry.data.reason}
                              </h3>
                              <p className="text-xs text-slate-500 mt-2">
                                {date(entry.data.occurredAt)} ·{" "}
                                {entry.author_name}
                              </p>
                            </div>
                            <div className="flex gap-3 items-start">
                              <button
                                onClick={() => setPrinted(entry)}
                                className="p-2 text-slate-500 hover:text-teal-800"
                                aria-label="Imprimir atención"
                              >
                                <Printer size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  setCorrection(entry);
                                  setForm(true);
                                  setNotice("");
                                }}
                                className="text-sm text-teal-700 p-2"
                              >
                                Añadir corrección
                              </button>
                            </div>
                          </div>
                          <p className="text-sm mt-4 whitespace-pre-wrap">
                            <span className="font-semibold">Diagnóstico: </span>
                            {entry.data.diagnosis}
                          </p>
                          <details className="mt-4 text-sm">
                            <summary className="text-teal-700 cursor-pointer">
                              Ver atención completa
                            </summary>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                              {clinicalFields
                                .filter(([key]) => entry.data[key])
                                .map(([key, label]) => (
                                  <div key={key}>
                                    <p className="font-semibold">
                                      {label.replace(" *", "")}
                                    </p>
                                    <p className="text-slate-600 whitespace-pre-wrap mt-1">
                                      {entry.data[key]}
                                    </p>
                                  </div>
                                ))}
                              <p>
                                PA: {entry.data.bloodPressure || "—"} mmHg · FC:{" "}
                                {entry.data.heartRate || "—"} lpm · FR:{" "}
                                {entry.data.respiratoryRate || "—"} rpm · T:{" "}
                                {entry.data.temperature || "—"} °C
                              </p>
                            </div>
                            <p className="mt-4 text-xs text-slate-400">
                              Registrada el {date(entry.created_at)}
                              {entry.data.correctionOf &&
                                ` · Corrige el registro ${entry.data.correctionOf}`}
                            </p>
                          </details>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
          {tab === "actas" && (
            <>
              <div>
                <h1 className="text-3xl font-semibold">Actas de dotación</h1>
                <p className="text-slate-500 mt-2">
                  Últimas 50 actas del sistema principal · consulta e impresión.
                </p>
              </div>
              {act?.success && act.transaction && act.items ? (
                <PrintReceipt
                  transaction={act.transaction}
                  items={act.items}
                  onBack={() => setAct(undefined)}
                />
              ) : (
                <section className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
                  {shared?.acts.length === 0 && (
                    <p className="p-6 text-slate-500">
                      No hay actas registradas.
                    </p>
                  )}
                  {shared?.acts.map((row) => (
                    <button
                      key={row.id}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          const result = await api.readSharedAct(row.id);
                          if (!result.success) throw new Error();
                          setAct(result);
                        } catch {
                          setError("No se pudo abrir el acta.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="w-full text-left p-5 hover:bg-slate-50 flex justify-between"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {row.transaction_type} · {row.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {date(row.created_at)}
                        </p>
                      </div>
                      <span className="text-teal-700 text-sm">Ver acta →</span>
                    </button>
                  ))}
                </section>
              )}
            </>
          )}
          {tab === "botiquin" && (
            <>
              <div>
                <h1 className="text-3xl font-semibold">Botiquín</h1>
                <p className="text-slate-500 mt-2">
                  Composición de los kits compartidos. Las cantidades
                  corresponden a cada kit, no al stock disponible.
                </p>
              </div>
              {shared?.kits.length === 0 && (
                <p className="p-6 bg-white rounded-xl">
                  No hay kits registrados.
                </p>
              )}
              <div className="grid xl:grid-cols-2 gap-5">
                {shared?.kits.map((kit) => (
                  <article
                    key={kit.id}
                    className="bg-white border border-slate-200 rounded-2xl p-6"
                  >
                    <HeartPulse className="text-teal-700 mb-4" />
                    <h2 className="font-semibold text-lg">{kit.name}</h2>
                    <p className="text-sm text-slate-500 mt-2 mb-5">
                      {kit.description}
                    </p>
                    <ul className="divide-y divide-slate-100">
                      {kit.items.map((item, i) => (
                        <li
                          key={i}
                          className="py-3 text-sm flex justify-between gap-4"
                        >
                          <span>{item.name}</span>
                          <span className="shrink-0 font-medium">
                            {item.quantity} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
      {printed && patient && (
        <section className="medical-print print-area">
          <h1>
            Historia clínica ·{" "}
            {printed.data.correctionOf ? "Corrección" : "Atención médica"}
          </h1>
          <p>
            <strong>{printed.worker_snapshot.full_name}</strong> · CI{" "}
            {printed.worker_snapshot.ci}
          </p>
          <p>
            {printed.worker_snapshot.position} ·{" "}
            {printed.worker_snapshot.department}
          </p>
          <p>
            Atención: {date(printed.data.occurredAt)} · Profesional:{" "}
            {printed.author_name}
          </p>
          {clinicalFields.map(([key, label]) => (
            <div key={key}>
              <h2>{label.replace(" *", "")}</h2>
              <p>{printed.data[key] || "No registrado"}</p>
            </div>
          ))}
          <p>
            PA: {printed.data.bloodPressure || "—"} mmHg · FC:{" "}
            {printed.data.heartRate || "—"} lpm · FR:{" "}
            {printed.data.respiratoryRate || "—"} rpm · T:{" "}
            {printed.data.temperature || "—"} °C
          </p>
          <p>
            Registro: {printed.id}
            {printed.data.correctionOf &&
              ` · Corrige: ${printed.data.correctionOf}`}
          </p>
          <p>Firma y sello del médico: ____________________</p>
          <p>Firma del trabajador: ____________________</p>
        </section>
      )}
    </div>
  );
}
