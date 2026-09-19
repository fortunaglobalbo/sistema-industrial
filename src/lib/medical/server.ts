import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const medicalCookie = "medical-code-session";
export const medicalCookieOptions = {
  httpOnly: true, sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production", path: "/historiales", maxAge: 8 * 60 * 60,
};

export async function medicalClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("El acceso médico aún no está configurado.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function requireMedical() {
  const token = (await cookies()).get(medicalCookie)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) throw new Error("Ingresa tu código para continuar.");
  const db = await medicalClient();
  const {data, error} = await db.rpc("medical_pin_session", {session_token:token});
  if (error || !data?.id || !data?.name) throw new Error("Tu sesión terminó. Ingresa nuevamente.");
  return {db, token, name: data.name as string};
}
