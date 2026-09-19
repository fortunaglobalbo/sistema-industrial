import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public, auth to anon,authenticated;
create table public.workers(id uuid primary key,full_name text,ci text,position text,department text);`);
for (const file of ['202609190001_medical.sql','202609190002_medical_code_throttle.sql','202609190003_medical_pin_sessions.sql']) {
  await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
}
const worker=randomUUID();
await db.query("insert into public.workers values($1,'Prueba ficticia','TEST','Pruebas','Pruebas')",[worker]);
async function login(code) {return (await db.query('select public.medical_pin_login($1) as result',[code])).rows[0].result;}
async function denied(sql,params=[]) {await assert.rejects(db.query(sql,params));}
async function resetWindow() {await db.exec("reset role; update public.medical_login_window set started_at=now()-interval '16 minutes'; set role anon;");}
await db.exec('set role anon');
for(const table of ['medical_staff','medical_code_access','medical_code_sessions','medical_encounters','medical_audit','medical_login_window']) await denied('select * from public.'+table);
await denied('select public.medical_pin_identity($1)',['0'.repeat(64)]);
await denied('select public.medical_claim_login_attempt()');
await denied('select public.medical_read_case($1)',[worker]);
assert.equal((await login('5500')).error,'invalid');
const session=await login('5501');
assert.match(session.token,/^[0-9a-f]{64}$/);
const valid=await db.query('select public.medical_pin_session($1) as staff',[session.token]);
assert.equal(valid.rows[0].staff.name,'Doctora');
for(const token of ['',null,'5501','f'.repeat(64)]) {
 await denied('select public.medical_pin_session($1)',[token]);
 await denied('select public.medical_pin_read_case($1,$2)',[token,worker]);
 await denied('select public.medical_pin_save_encounter($1,$2)',[token,{}]);
}
const input={workerId:worker,requestId:randomUUID(),occurredAt:new Date().toISOString(),kind:'consulta',reason:'Ficticio',illness:'',personalHistory:'',occupationalHistory:'',familyHistory:'',examination:'',bloodPressure:'',heartRate:'',respiratoryRate:'',temperature:'',diagnosis:'Prueba',treatment:'',referral:'',recommendations:''};
const saved=(await db.query('select public.medical_pin_save_encounter($1,$2) as id',[session.token,input])).rows[0].id;
assert.equal((await db.query('select public.medical_pin_save_encounter($1,$2) as id',[session.token,input])).rows[0].id,saved);
const history=(await db.query('select public.medical_pin_read_case($1,$2) as record',[session.token,worker])).rows[0].record;
assert.equal(history.encounters.length,1);
assert.equal(history.encounters[0].author_name,'Doctora');
assert.equal((await db.query("select nullif(current_setting('request.jwt.claim.sub',true),'') as subject")).rows[0].subject,null);
await db.exec('set role authenticated');
await denied('select public.medical_read_case($1)',[worker]);
await denied('select public.medical_save_encounter($1)',[input]);
await db.exec('set role anon');
await db.query('select public.medical_pin_logout($1)',[session.token]);
await denied('select public.medical_pin_session($1)',[session.token]);
await denied('select public.medical_pin_read_case($1,$2)',[session.token,worker]);
await resetWindow();
const results=await Promise.all(Array.from({length:7},()=>login('0000')));
assert.equal(results.filter(r=>r.error==='invalid').length,5);
assert.equal(results.filter(r=>r.error==='locked').length,2);
assert.equal((await login('5501')).error,'locked');
await resetWindow();
const second=await login('5501');
await db.exec("reset role; update public.medical_code_sessions set expires_at=now()-interval '1 second'; set role anon;");
await denied('select public.medical_pin_session($1)',[second.token]);
const third=await login('5501');
await db.exec("reset role; update public.medical_staff set active=false; set role anon;");
await denied('select public.medical_pin_session($1)',[third.token]);
assert.equal((await login('5501')).error,'invalid');
await db.exec('reset role');
assert.equal((await db.query('select * from public.medical_audit')).rows.length,2);
assert.equal((await db.query('select * from auth.users')).rows.length,0);
await db.close();
console.log('OK: código directo sin cuentas de correo, permisos, sesiones opacas, bloqueo, vencimiento, revocación, acceso clínico y auditoría.');
