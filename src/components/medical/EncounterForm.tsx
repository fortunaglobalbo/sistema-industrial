"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { saveMedicalEncounter } from "@/app/historiales/actions";
import type { Encounter, EncounterInput } from "@/lib/medical/types";

const sections: { title: string; fields: [keyof EncounterInput, string][] }[] =
  [
    {
      title: "Motivo y antecedentes",
      fields: [
        ["reason", "Motivo de consulta *"],
        ["illness", "Enfermedad actual"],
        ["personalHistory", "Antecedentes personales y alergias"],
        ["occupationalHistory", "Antecedentes ocupacionales"],
        ["familyHistory", "Antecedentes familiares"],
      ],
    },
    {
      title: "Evaluación y conducta",
      fields: [
        ["examination", "Examen físico"],
        ["diagnosis", "Diagnóstico *"],
        ["treatment", "Tratamiento"],
        ["referral", "Interconsulta"],
        ["recommendations", "Observaciones y recomendaciones"],
      ],
    },
  ];
export const clinicalFields = sections.flatMap((s) => s.fields);
export default function EncounterForm({
  workerId,
  correction,
  onClose,
  onSaved,
  onDirty,
  save = saveMedicalEncounter,
  onSavingChange,
}: {
  workerId: string;
  correction?: Encounter;
  onClose: () => void;
  onSaved: () => void;
  onDirty: () => void;
  save?: typeof saveMedicalEncounter;
  onSavingChange: (saving: boolean) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return (
    <form
      onChange={onDirty}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        const date = new Date(String(form.get("occurredAt")));
        if (Number.isNaN(date.getTime())) {
          setError("Revisa la fecha de atención.");
          return;
        }
        setBusy(true);
        onSavingChange(true);
        setError("");
        try {
          const result = await save({
            ...Object.fromEntries(form),
            workerId,
            requestId,
            occurredAt: date.toISOString(),
            ...(correction ? { correctionOf: correction.id } : {}),
          });
          if (result.error) setError(result.error);
          else onSaved();
        } catch {
          setError(
            "No se confirmó el guardado. Conserva este formulario e intenta nuevamente.",
          );
        } finally {
          setBusy(false);
          onSavingChange(false);
        }
      }}
      className="rounded-2xl bg-white border border-slate-200 p-5 md:p-8 space-y-7"
    >
      <div className="flex justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-teal-700 mb-2">
            Registro médico
          </p>
          <h2 className="text-2xl font-semibold">
            {correction ? "Corrección de atención" : "Nueva atención"}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {correction
              ? "El registro original se conserva. Describe la corrección en las observaciones."
              : "Los campos con * son obligatorios. La atención quedará cerrada al guardar."}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Cerrar formulario"
          className="self-start p-2 hover:bg-slate-100 rounded-lg"
        >
          <X size={20} />
        </button>
      </div>
      <fieldset disabled={busy} className="space-y-7 disabled:opacity-60">
        <div className="grid sm:grid-cols-2 gap-5">
          <label className="text-sm font-medium">
            Fecha y hora *
            <input
              name="occurredAt"
              type="datetime-local"
              required
              defaultValue={local}
              className="medical-input"
            />
          </label>
          <label className="text-sm font-medium">
            Tipo de atención
            <select
              name="kind"
              defaultValue={correction?.data.kind || "consulta"}
              className="medical-input"
            >
              <option value="consulta">Consulta</option>
              <option value="reconsulta">Reconsulta</option>
            </select>
          </label>
        </div>
        {sections.map((section, index) => (
          <section key={section.title} className="space-y-5">
            <h3 className="text-base font-semibold border-b border-slate-100 pb-3">
              {section.title}
            </h3>
            {index === 1 && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {(
                  [
                    ["bloodPressure", "PA · mmHg", "120/80"],
                    ["heartRate", "FC · lpm", ""],
                    ["respiratoryRate", "FR · rpm", ""],
                    ["temperature", "Temperatura · °C", ""],
                  ] as const
                ).map(([name, label, placeholder]) => (
                  <label key={name} className="text-sm text-slate-600">
                    {label}
                    <input
                      name={name}
                      defaultValue={correction?.data[name] || ""}
                      placeholder={placeholder}
                      maxLength={20}
                      inputMode={name === "bloodPressure" ? "text" : "decimal"}
                      className="medical-input"
                    />
                  </label>
                ))}
              </div>
            )}
            <div className="grid lg:grid-cols-2 gap-5">
              {section.fields.map(([name, label]) => (
                <label key={name} className="text-sm font-medium">
                  {label}
                  <textarea
                    name={name}
                    defaultValue={String(correction?.data[name] || "")}
                    required={name === "reason" || name === "diagnosis"}
                    rows={3}
                    maxLength={6000}
                    className="medical-input resize-y"
                  />
                </label>
              ))}
            </div>
          </section>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="p-4 bg-red-50 text-red-800 rounded-xl">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="px-5 py-3 text-slate-600"
        >
          Cancelar
        </button>
        <button disabled={busy} className="medical-primary">
          <Check size={18} />
          {busy ? "Guardando…" : "Guardar y cerrar atención"}
        </button>
      </div>
    </form>
  );
}
