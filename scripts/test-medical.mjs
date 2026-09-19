import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const db = new PGlite();
const doctor = randomUUID(),
  outsider = randomUUID(),
  worker = randomUUID(),
  otherWorker = randomUUID();
await db.exec(`create role anon; create role authenticated; create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create table public.workers(id uuid primary key, full_name text, ci text, position text, department text);`);
await db.exec(
  await readFile(
    new URL("../supabase/migrations/202609190001_medical.sql", import.meta.url),
    "utf8",
  ),
);
await db.query("insert into auth.users values ($1),($2)", [doctor, outsider]);
await db.query(
  "insert into public.workers values ($1,'Paciente Ficticio','TEST-1','Pruebas','Pruebas'),($2,'Otro Ficticio','TEST-2','Pruebas','Pruebas')",
  [worker, otherWorker],
);
await db.query(
  "insert into public.medical_staff values ($1,'Doctora de pruebas',true)",
  [doctor],
);
async function as(role, id = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`set role ${role}`);
}
async function denied(sql, params = []) {
  await assert.rejects(db.query(sql, params));
}
await as("anon");
await denied("select public.medical_read_case($1)", [worker]);
await denied("select * from public.medical_encounters");
await denied("select public.medical_save_encounter($1)", [{}]);
await as("authenticated", outsider);
await denied("select public.medical_read_case($1)", [worker]);
await denied("select public.medical_save_encounter($1)", [{}]);
await denied("insert into public.medical_staff values ($1,$2,true)", [
  outsider,
  "Intruso",
]);
assert.equal(
  (await db.query("select * from public.medical_staff")).rows.length,
  0,
);
await as("authenticated", doctor);
assert.equal(
  (await db.query("select * from public.medical_staff")).rows.length,
  1,
);
await denied("select * from public.medical_encounters");
const payload = {
  workerId: worker,
  requestId: randomUUID(),
  occurredAt: new Date().toISOString(),
  kind: "consulta",
  reason: "Caso ficticio",
  illness: "",
  personalHistory: "",
  occupationalHistory: "",
  familyHistory: "",
  examination: "",
  bloodPressure: "120/80",
  heartRate: "70",
  respiratoryRate: "18",
  temperature: "36.5",
  diagnosis: "Datos de prueba",
  treatment: "",
  referral: "",
  recommendations: "",
};
const saved = (
  await db.query("select public.medical_save_encounter($1) as id", [payload])
).rows[0].id;
assert.equal(
  (await db.query("select public.medical_save_encounter($1) as id", [payload]))
    .rows[0].id,
  saved,
);
await denied("select public.medical_save_encounter($1)", [
  { ...payload, diagnosis: "Cambio con misma solicitud" },
]);
await denied("select public.medical_save_encounter($1)", [
  { ...payload, requestId: randomUUID(), diagnosis: "" },
]);
await denied("select public.medical_save_encounter($1)", [
  { ...payload, requestId: randomUUID(), temperature: "99" },
]);
await denied("select public.medical_save_encounter($1)", [
  {
    ...payload,
    requestId: randomUUID(),
    workerId: otherWorker,
    correctionOf: saved,
  },
]);
await denied("update public.medical_encounters set author_name=$1", [
  "Alterado",
]);
await denied("delete from public.medical_encounters");
await denied("select * from public.medical_audit");
await db.query("select public.medical_save_encounter($1)", [
  {
    ...payload,
    requestId: randomUUID(),
    correctionOf: saved,
    recommendations: "Corrección de prueba",
  },
]);
const record = (
  await db.query("select public.medical_read_case($1) as record", [worker])
).rows[0].record;
assert.equal(record.encounters.length, 2);
assert.equal(record.encounters[0].worker_snapshot.ci, "TEST-1");
await db.exec("reset role");
assert.equal(
  (await db.query("select * from public.medical_audit where event='create'"))
    .rows.length,
  2,
);
assert.equal(
  (await db.query("select * from public.medical_audit where event='read'")).rows
    .length,
  1,
);
await db.query(
  "update public.medical_staff set active=false where user_id=$1",
  [doctor],
);
await as("authenticated", doctor);
await denied("select public.medical_read_case($1)", [worker]);
await denied("select public.medical_save_encounter($1)", [
  { ...payload, requestId: randomUUID() },
]);
await db.close();
console.log(
  "OK: permisos, acceso anónimo, cuentas sin rol y desactivadas, validación, idempotencia, correcciones, snapshot y auditoría. Base de prueba en memoria, sin datos reales.",
);
