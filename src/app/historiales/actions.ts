"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { medicalClient, requireMedical, medicalCookie, medicalCookieOptions } from '@/lib/medical/server';
import type {
  MedicalCase,
  MedicalWorker,
  SharedData,
} from "@/lib/medical/types";

const text = z.string().trim().max(6000);
const optionalNumber = (min: number, max: number) =>
  z
    .string()
    .refine(
      (v) =>
        v === "" ||
        (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max),
      "Revisa el valor y la unidad.",
    );
const encounterSchema = z.object({
  workerId: z.uuid(),
  requestId: z.uuid(),
  correctionOf: z.uuid().optional(),
  occurredAt: z.iso
    .datetime({ offset: true })
    .refine(
      (v) => Date.parse(v) <= Date.now() + 60000,
      "La atención no puede estar en el futuro.",
    ),
  kind: z.enum(["consulta", "reconsulta"]),
  reason: text.min(1),
  illness: text,
  personalHistory: text,
  occupationalHistory: text,
  familyHistory: text,
  examination: text,
  bloodPressure: z
    .string()
    .max(20)
    .refine(
      (v) => !v || /^\d{2,3}\/\d{2,3}$/.test(v),
      "Usa el formato 120/80.",
    ),
  heartRate: optionalNumber(1, 350),
  respiratoryRate: optionalNumber(1, 150),
  temperature: optionalNumber(20, 50),
  diagnosis: text.min(1),
  treatment: text,
  referral: text,
  recommendations: text,
});

export async function loginMedical(_state: { error: string }, form: FormData) {
  const code = form.get("code");
  if (typeof code !== "string" || !/^[0-9]{4}$/.test(code))
    return { error: "Ingresa tu código de cuatro dígitos." };
  try {
    const db = await medicalClient();
    const {data,error} = await db.rpc("medical_pin_login", {code});
    if (error) return {error:"El acceso por código no está disponible. Verifica la activación en Supabase."};
    if (data?.error === "locked") return {error:"Se alcanzó el límite de intentos. Espera 15 minutos e intenta nuevamente."};
    if (typeof data?.token !== "string" || !/^[0-9a-f]{64}$/.test(data.token)) return {error:"Código incorrecto o acceso desactivado."};
    const jar = await cookies();
    const previous = jar.get(medicalCookie)?.value;
    if (previous) await db.rpc("medical_pin_logout",{session_token:previous});
    jar.set(medicalCookie, data.token, medicalCookieOptions);
  } catch { return {error:"El acceso médico no está disponible. Intenta más tarde."}; }
  redirect("/historiales");
}

export async function logoutMedical() {
  const jar = await cookies();
  const token = jar.get(medicalCookie)?.value;
  try {
    if (token) {
      const db = await medicalClient();
      const {error} = await db.rpc("medical_pin_logout",{session_token:token});
      if (error) throw new Error("No se pudo cerrar la sesión. Intenta nuevamente.");
    }
  } catch { throw new Error("No se pudo cerrar la sesión. Comprueba tu conexión e intenta nuevamente."); }
  jar.set(medicalCookie, "", {...medicalCookieOptions,maxAge:0});
  redirect("/historiales/ingresar");
}

export async function searchMedicalWorkers(
  query: string,
): Promise<MedicalWorker[]> {
  const { db, token } = await requireMedical();
  const {data,error}=await db.rpc('medical_patients_search',{session_token:token,query:z.string().max(100).parse(query).trim()});
  if(error) throw new Error('No se pudieron cargar las personas atendidas. Verifica la actualización 005 en Supabase.');
  return data;
}

export async function readMedicalCase(workerId: string): Promise<MedicalCase> {
  const { db, token } = await requireMedical();
  const { data, error } = await db.rpc("medical_patient_case", {
    session_token: token,
    target: z.uuid().parse(workerId),
  });
  if (error || !data)
    throw new Error(
      "No se pudo abrir el expediente. Verifica que el módulo esté habilitado.",
    );
  return data as MedicalCase;
}

export async function saveMedicalEncounter(input: unknown) {
  try {
    const { db, token } = await requireMedical();
    const parsed = encounterSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { error } = await db.rpc("medical_pin_save_encounter", {
      session_token: token,
      payload: parsed.data,
    });
    if (error)
      return {
        error:
          "No se guardó la atención. Revisa los datos e intenta nuevamente; no cierres el formulario.",
      };
    return { success: true as const };
  } catch {
    return {
      error: "No se guardó la atención. Revisa tu sesión e intenta nuevamente.",
    };
  }
}

export async function getMedicalShared(): Promise<SharedData> {
  const { db } = await requireMedical();
  const [acts, kits] = await Promise.all([
    db
      .from("transactions")
      .select("id,created_at,transaction_type,worker_id")
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("medicine_kits").select("id,name,description,items").order("name"),
  ]);
  if (acts.error || kits.error)
    throw new Error(
      "No se pudieron cargar los registros compartidos. No se muestran datos de demostración.",
    );
  return { acts: acts.data, kits: kits.data };
}

export async function readSharedAct(id: string) {
  await requireMedical();
  const { getTransactionDetails } = await import("@/app/actions/transaction");
  return getTransactionDetails(z.uuid().parse(id));
}
