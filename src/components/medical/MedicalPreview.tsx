"use client";
import { useMemo } from "react";
import { useRouter } from 'next/navigation';
import MedicalWorkspace, { type MedicalApi } from "./MedicalWorkspace";
import type {
  Encounter,
  EncounterInput,
  MedicalWorker,
} from "@/lib/medical/types";

// Vista aislada para revisión local: ningún método llama a Supabase.
export default function MedicalPreview() {
  const router = useRouter();
  const api = useMemo<MedicalApi>(() => {
    const worker: MedicalWorker = {
      id: "00000000-0000-4000-8000-000000000001",
      full_name: "Trabajadora de ejemplo · Datos ficticios",
      ci: "PRUEBA-001",
      position: "Técnica de mantenimiento",
      department: "Área de pruebas",
    };
    const entries: Encounter[] = [];
    return {
      searchMedicalWorkers: async (query) =>
        [worker].filter((w) =>
          `${w.full_name} ${w.ci}`.toLowerCase().includes(query.toLowerCase()),
        ),
      readMedicalCase: async () => ({ worker, encounters: [...entries] }),
      saveMedicalEncounter: async (input) => {
        const data = input as EncounterInput;
        if (!entries.some((e) => e.data.requestId === data.requestId))
          entries.unshift({
            id: crypto.randomUUID(),
            worker_id: worker.id,
            worker_snapshot: worker,
            author_name: "Doctora de ejemplo",
            created_at: new Date().toISOString(),
            data,
          });
        return { success: true as const };
      },
      getMedicalShared: async () => ({
        acts: [],
        kits: [
          {
            id: "kit-prueba",
            name: "Botiquín de ejemplo",
            description: "Composición ficticia para revisar la pantalla.",
            items: [
              { name: "Gasas de ejemplo", quantity: 5, unit: "paquetes" },
            ],
          },
        ],
      }),
      readSharedAct: async () => ({
        success: false,
        error: "No hay actas reales en esta vista.",
      }),
      logoutMedical: async () => {
        router.push('/historiales/ingresar');
      },
    };
  }, [router]);
  return (
    <>
      <div
        role="status"
        className="bg-amber-100 text-amber-950 text-center p-3 text-sm print:hidden"
      >
        Vista previa local · Datos ficticios · Los cambios se pierden al
        recargar
      </div>
      <MedicalWorkspace doctor="Doctora de ejemplo" api={api} />
    </>
  );
}
