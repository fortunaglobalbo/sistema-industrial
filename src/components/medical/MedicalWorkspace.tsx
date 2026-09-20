"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  ClipboardList,
  History,
  PlusCircle,
  FileHeart,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Plus,
  Printer,
  Search,
  ShieldCheck,
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
} from "@/lib/medical/types";
import EncounterForm, { clinicalFields } from "./EncounterForm";
import ActasModule from "@/components/ActasModule";
import ModuloMedicamentosKits from "@/components/ModuloMedicamentosKits";
import "./medical.css";
import MedicalDocuments from './MedicalDocuments';
import WorkerDocuments from './WorkerDocuments';
import type { MedicalDocument } from '@/lib/medical/templates';
import { documentsApi, previewDocumentsApi } from '@/lib/medical/document-api';

type Tab = "inicio" | "trabajadores" | "formatos" | "registrar" | "actas" | "botiquin";
const navigation = [
  { id: "inicio", label: "Inicio", icon: LayoutDashboard },
  { id: "trabajadores", label: "Historias clínicas", icon: FileHeart },
  { id: "formatos", label: "Formatos médicos", icon: ClipboardList },
  { id: "registrar", label: "Registrar Acta", icon: PlusCircle },
  { id: "actas", label: "Historial Actas", icon: History },
  { id: "botiquin", label: "Medicamentos", icon: HeartPulse },
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
  const [formsApi] = useState(()=>api===liveApi?documentsApi:previewDocumentsApi());
  const [formsEntry,setFormsEntry] = useState<{template?:string;worker?:MedicalWorker;document?:MedicalDocument;key:number}>({key:0});
  const [workers, setWorkers] = useState<MedicalWorker[]>([]);
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState<MedicalCase>();
  const [form, setForm] = useState(false);
  const [correction, setCorrection] = useState<Encounter>();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [printed, setPrinted] = useState<Encounter>();
  const sequence = useRef(0);
  useEffect(() => {
    if(tab!=="trabajadores")return;
    let alive = true;
    formsApi
      .searchPatients("")
      .then((rows) => {
        if (alive) setWorkers(rows);
      })
      .catch(() => {
        if (alive)
          setError("No se pudieron cargar las personas atendidas. Usa Buscar para reintentar.");
      });
    return () => {
      alive = false;
    };
  }, [formsApi,tab]);
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
      const value = await formsApi.readPatient(workerId);
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
    setError("");
    setNotice("");
    if(next==='formatos') setFormsEntry(prev=>({key:prev.key+1}));
  }
  function openFormats(template?:string,worker?:MedicalWorker,document?:MedicalDocument){
    if(busy||!leave())return;
    setFormsEntry(prev=>({template,worker,document,key:prev.key+1}));
    setTab('formatos');setPatient(undefined);setDirty(false);setError('');setNotice('');setForm(false);
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setWorkers(await formsApi.searchPatients(query));
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
    <div className="medical-shell min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="relative bg-slate-950 text-white border-b-2 border-amber-400/70 shadow-xl overflow-hidden print:hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-85 pointer-events-none" style={{backgroundImage:'url(/banner_subestacion.png)'}} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#001e47]/80 via-[#002f6c]/65 to-[#001530]/80 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/95 p-2.5 rounded-2xl shadow-lg shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_ende_deoruro.png" alt="ENDE DEORURO" className="h-11 w-auto object-contain"/>
            </div>
            <div>
              <span className="text-[9px] font-black tracking-widest uppercase bg-amber-400/25 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/40">ENDE DEORURO</span>
              <p className="text-base sm:text-lg font-black tracking-wide uppercase mt-1">Seguridad Industrial y Salud Ocupacional</p>
              <p className="text-[11px] text-blue-100 font-medium">Historias clínicas, consultas médicas, actas de dotación y botiquines</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black rounded-xl border border-rose-500/50 bg-rose-950/80 text-rose-200 px-3 py-2">{doctor}</span>
            <Link href="/" onClick={e=>{if(!leave())e.preventDefault();}} className="flex items-center gap-2 text-xs font-extrabold bg-[#003876]/80 border border-white/20 rounded-xl px-3 py-2 hover:bg-[#004b93]"><ArrowLeft size={14}/> Sistema principal</Link>
            <form action={api.logoutMedical} onSubmit={e=>{if(busy || !leave())e.preventDefault();}}>
              <button disabled={busy} className="flex items-center gap-2 text-xs font-extrabold bg-slate-950/60 border border-white/20 rounded-xl px-3 py-2 hover:bg-slate-800"><LogOut size={14}/> Cerrar sesión</button>
            </form>
          </div>
        </div>
      </header>
      <div className="min-w-0">
        <section className="max-w-7xl mx-auto px-4 pt-6 print:hidden" aria-label="Navegación médica">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div><span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Módulo activo</span><h2 className="text-xl font-black text-[#002f6c] tracking-tight mt-2">{tab === "registrar" ? "Registrar Acta de Dotación / Entrega" : tab === "actas" ? "Historial de Actas y Dotaciones EPP" : tab === "botiquin" ? "Gestión y Armado de Kits de Medicamentos / Botiquines" : title}</h2><p className="text-xs text-slate-500 font-medium mt-1">Gestión médica ocupacional del personal</p></div>
            <nav className="flex flex-wrap p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-full xl:w-auto gap-1 shadow-inner">
              {navigation.map(({id,label,icon:Icon})=><button key={id} disabled={busy} onClick={()=>navigate(id)} aria-current={tab===id ? 'page' : undefined} className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl transition disabled:opacity-50 ${tab===id ? 'bg-[#002f6c] text-white font-black shadow-md border-b-2 border-amber-400' : 'text-slate-600 hover:bg-white font-bold'}`}><Icon size={16} className={tab===id ? 'text-amber-400' : 'text-blue-700'}/>{label}</button>)}
            </nav>
          </div>
        </section>
        <main className="p-4 md:py-6 max-w-7xl mx-auto space-y-6">
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
              className="bg-blue-50 rounded-xl p-4 text-blue-900"
            >
              {notice}
            </div>
          )}
          {busy && (
            <p role="status" className="text-sm text-blue-900">
              Cargando registros…
            </p>
          )}
          {tab === "inicio" && (
            <>
              <div className="flex flex-wrap justify-between items-end gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-800 mb-2">
                    Atención y seguimiento
                  </p>
                  <h1 className="text-3xl font-bold">
                    Bienvenida, {doctor}
                  </h1>
                  <p className="text-slate-500 mt-3">
                    Panel de consultas e historias clínicas del personal.
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
              <section className="rounded-2xl bg-blue-50 border border-blue-100 p-7 md:p-9 flex flex-wrap justify-between items-center gap-6">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2 text-blue-900 text-xs font-bold uppercase tracking-wider mb-4">
                    <Activity size={16} /> Consulta médica
                  </div>
                  <h2 className="text-2xl font-bold text-[#002f6c]">
                    Registro de consultas médicas
                  </h2>
                  <p className="text-slate-600 mt-3 mb-6">
                    Busca al trabajador para consultar sus antecedentes o
                    registrar una nueva atención.
                  </p>
                  <button
                    onClick={() => openFormats('historia')}
                    className="medical-primary"
                  >
                    <Plus size={18} /> Registrar atención
                  </button>
                </div>
                <FileHeart
                  size={100}
                  strokeWidth={1}
                  className="text-blue-800/50 hidden md:block"
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
                    text: "Registro, reimpresión, corrección y planilla mensual de actas.",
                    icon: ClipboardList,
                  },
                  {
                    id: "botiquin" as const,
                    title: "Botiquines compartidos",
                    text: "Gestión de medicamentos y armado de botiquines.",
                    icon: HeartPulse,
                  },
                ].map(({ id, title, text, icon: Icon }) => (
                  <button
                    key={id}
                    disabled={busy}
                    onClick={() => navigate(id)}
                    className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-blue-400 transition"
                  >
                    <div className="flex justify-between mb-6">
                      <Icon className="text-blue-800" size={24} />
                      <ArrowUpRight size={17} className="text-slate-400" />
                    </div>
                    <h3 className="font-bold mb-2">{title}</h3>
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
                <h1 className="text-3xl font-bold">Historias clínicas</h1>
                <p className="mt-2 text-slate-500">
                  Aquí aparecen solo las personas con registros médicos guardados.
                </p>
              </div>
              <button className="medical-primary" onClick={()=>openFormats('historia')}><Plus size={16}/> Nueva atención</button>
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
                    onChange={(e) => setQuery(e.target.value.toUpperCase())}
                    placeholder="Buscar por nombre o cédula de identidad…"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 outline-blue-700"
                  />
                </div>
                <button disabled={busy} className="medical-primary">
                  Buscar
                </button>
              </form>
              <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between">
                  <h2 className="font-bold">Personas atendidas</h2>
                  <span className="text-xs text-slate-500">
                    Hasta 50 resultados · afina la búsqueda
                  </span>
                </div>
                {workers.length === 0 ? (
                  <p className="p-8 text-slate-500">
                    No hay atenciones registradas para esta búsqueda. Usa Nueva atención para escribir los datos de una persona.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {workers.map((worker) => (
                      <button
                        key={worker.id}
                        disabled={busy}
                        onClick={() => openPatient(worker.id)}
                        className="w-full text-left p-5 hover:bg-blue-50/50 flex justify-between items-center gap-4"
                      >
                        <div>
                          <p className="font-medium">{worker.full_name}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            CI {worker.ci} · {worker.position} ·{" "}
                            {worker.department}
                          </p>
                        </div>
                        <span className="text-blue-800 text-sm flex items-center gap-2 shrink-0">
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
                <ArrowLeft size={16} /> Personas atendidas
              </button>
              <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap gap-5 justify-between items-center">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-800 mb-2">
                    Expediente clínico
                  </p>
                  <h1 className="text-2xl font-bold">
                    {patient.worker.full_name}
                  </h1>
                  <p className="text-sm text-slate-500 mt-2">
                    CI {patient.worker.ci} · {patient.worker.position} ·{" "}
                    {patient.worker.department}
                  </p>
                </div>
                {!form && (<div className="flex flex-wrap gap-2"><button className="border rounded-xl px-4 py-2 text-sm font-bold text-blue-800" onClick={()=>openFormats(undefined,patient.worker)}>Formatos e historial</button><button
                    className="medical-primary"
                    onClick={() => {
                      openFormats('historia',patient.worker);
                    }}
                  >
                    <Plus size={18} /> Nueva atención
                  </button></div>
                )}
              </section>
              {!form&&<WorkerDocuments key={patient.worker.id} workerId={patient.worker.id} api={formsApi} onOpen={doc=>openFormats(doc.template_id,patient.worker,doc)}/>}
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
                    <h2 className="font-bold">Atenciones del formato anterior</h2>
                    <span className="text-sm text-slate-500">
                      {patient.encounters.length} registros
                    </span>
                  </div>
                  {patient.encounters.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                      <FileHeart
                        className="mx-auto text-blue-700 mb-4"
                        size={32}
                      />
                      <h3 className="font-bold">
                        No hay atenciones del formato anterior
                      </h3>
                      <p className="text-sm text-slate-500 mt-2">
                        Las nuevas fichas se consultan en el historial de formatos de este trabajador.
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
                              <span className="text-xs rounded-full bg-blue-50 text-blue-900 px-3 py-1">
                                {entry.data.correctionOf
                                  ? "Corrección"
                                  : entry.data.kind === "consulta"
                                    ? "Consulta"
                                    : "Reconsulta"}
                              </span>
                              <h3 className="font-bold text-lg mt-3">
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
                                className="p-2 text-slate-500 hover:text-blue-900"
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
                                className="text-sm text-blue-800 p-2"
                              >
                                Añadir corrección
                              </button>
                            </div>
                          </div>
                          <p className="text-sm mt-4 whitespace-pre-wrap">
                            <span className="font-bold">Diagnóstico: </span>
                            {entry.data.diagnosis}
                          </p>
                          <details className="mt-4 text-sm">
                            <summary className="text-blue-800 cursor-pointer">
                              Ver atención completa
                            </summary>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                              {clinicalFields
                                .filter(([key]) => entry.data[key])
                                .map(([key, label]) => (
                                  <div key={key}>
                                    <p className="font-bold">
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
          {tab==='formatos'&&<MedicalDocuments key={formsEntry.key} doctor={doctor} search={formsApi.searchPatients} api={formsApi} initialWorker={formsEntry.worker} initialTemplate={formsEntry.template} initialDocument={formsEntry.document} onDirty={setDirty} onBusy={setSaving}/>}
          {(tab === "registrar" || tab === "actas" || tab === "botiquin") && (
            api !== liveApi ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="font-bold text-[#002f6c]">Módulos compartidos del sistema ENDE</h2>
                <p className="mt-2 text-sm text-slate-600">Registrar Acta, Historial Actas y Medicamentos están disponibles al ingresar con el código de la doctora. Esta vista previa no modifica registros reales.</p>
              </div>
            ) : tab === "botiquin" ? (
              <><div className="bg-white border rounded-xl p-4 flex flex-wrap justify-between gap-3 items-center"><div><h2 className="font-bold text-[#002f6c]">Control mensual de farmacia</h2><p className="text-sm text-slate-500">Ingresos, consumos diarios, saldo y vencimiento.</p></div><button className="medical-primary" onClick={()=>openFormats('farmacia')}>Abrir planilla de farmacia</button></div><ModuloMedicamentosKits showTabs={false} /></>
            ) : (
              <ActasModule key={tab} activeTab={tab === "registrar" ? "new" : "history"} onTabChange={next => { void navigate(next === "new" ? "registrar" : "actas"); }} />
            )
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
