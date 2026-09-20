import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url);
const catalog={};new Function('exports',ts.transpileModule(await readFile(new URL('../src/lib/medical/templates.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(catalog);
const validation={};new Function('exports','require',ts.transpileModule(await readFile(new URL('../src/lib/medical/document-validation.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(validation,id=>id==='./templates'?catalog:require(id));
const previewExports={};new Function('exports','require',ts.transpileModule(await readFile(new URL('../src/lib/medical/document-api.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(previewExports,id=>id==='./document-validation'?validation:{});
const printExports={};new Function('exports','require',ts.transpileModule(await readFile(new URL('../src/components/medical/MedicalDocumentPrint.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText)(printExports,id=>id==='@/lib/medical/templates'?catalog:require(id));
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to anon,authenticated;create table public.workers(id uuid primary key,full_name text,ci text,position text,department text);`);
for(const file of ['202609190001_medical.sql','202609190002_medical_code_throttle.sql','202609190003_medical_pin_sessions.sql','202609190004_medical_documents.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
const worker=randomUUID(),other=randomUUID();await db.query("insert into workers values($1,'Trabajador ficticio','TEST','Prueba','Prueba'),($2,'Otro ficticio','TEST-2','Prueba','Prueba')",[worker,other]);
const definitions=(await db.query('select definition from medical_form_templates order by id')).rows.map(r=>r.definition);
assert.deepEqual(definitions,catalog.templates.toSorted((a,b)=>a.id.localeCompare(b.id)),'SQL and UI field catalogs must agree');
await db.exec('set role anon');
const token=(await db.query("select medical_pin_login('5501') as s")).rows[0].s.token;
const save=async p=>(await db.query('select medical_document_save($1,$2) as d',[token,p])).rows[0].d;
const list=async f=>(await db.query('select medical_documents_list($1,$2) as d',[token,f])).rows[0].d;
const denied=(sql,args=[])=>assert.rejects(db.query(sql,args));
for(const table of ['medical_documents','medical_form_templates','medical_document_workers','medical_document_requests','medical_document_audit'])await denied('select * from '+table);
await denied('select medical_documents_list($1,$2)',['0'.repeat(64),{}]);
function input(t){const period=t.period==='year'?'2026-01-01':'2026-09-01';const fill=fs=>Object.fromEntries(fs.filter(f=>f.required).map(f=>[f.key,f.type==='date'?period:'Prueba ficticia']));return {id:randomUUID(),requestId:randomUUID(),revision:0,templateId:t.id,workerId:t.kind==='ficha'?worker:null,period,finalize:false,correctionOf:null,correctionReason:'',data:{fields:fill(t.sections.flatMap(s=>s.fields)),rows:t.kind==='planilla'?[{...fill(t.columns),...(t.id==='farmacia'?{opening:'20',incoming:'5',day1:'3'}:{workerId:worker,fullName:'Trabajador ficticio',ci:'TEST'})}]:[]}};}
const preview=previewExports.previewDocumentsApi();const previewInput={...input(catalog.getTemplate('historia')),finalize:true};previewInput.data.fields.names='PERSONA DE PRUEBA';
assert.ok((await preview.save(previewInput)).document);
assert.equal((await preview.list({})).documents.length,2);
assert.equal((await preview.list({template:'historia'})).documents[0].superseded,false,'derived consultation must not mark the source as corrected');
let history;
for(const t of catalog.templates){
 const p=input(t);validation.validateDocument(p);
 const draft=await save(p);assert.equal(draft.status,'draft');assert.equal(draft.revision,1);
 assert.equal((await save(p)).id,draft.id,'network retry must be idempotent');
 await assert.rejects(save({...p,data:{...p.data,fields:{unknown:'injected'}}}));
 const updated={...p,revision:1,requestId:randomUUID()};const v2=await save(updated);assert.equal(v2.revision,2);
 await assert.rejects(save({...updated,requestId:randomUUID()}),/Conflicto/);
 const finalized={...p,revision:2,requestId:randomUUID(),finalize:true};const v3=await save(finalized);assert.equal(v3.status,'final');assert.equal(v3.revision,3);
 const html=renderToStaticMarkup(createElement(printExports.MedicalPaper,{doc:v3}));assert.match(html,/ENDE DEORURO/);assert.match(html,/Guardado/);assert.ok(!html.includes('Guardar borrador'));
 for(const section of t.sections.filter(s=>!s.title.startsWith('Datos para el registro')))assert.ok(html.includes(section.title),`Print missing section: ${section.title}`);
 if(t.id==='consultas'){assert.match(html,/>Consulta<\/th>/);assert.match(html,/>Reconsulta<\/th>/);assert.match(html,/Firma paciente/);}
 if(t.id==='farmacia'){assert.equal((html.match(/class="day"/g)||[]).length,30);assert.match(html,/Fecha de vencimiento/);}
 await assert.rejects(save({...finalized,revision:3,requestId:randomUUID()}),/final/);
 if(t.id==='farmacia'){assert.equal(v3.data.rows[0].used,'3');assert.equal(v3.data.rows[0].balance,'22');}
 if(t.id==='historia')history={p,doc:v3};
}
assert.equal((await list({template:'consultas'})).documents.length,2,'history should produce one consultation');
assert.equal((await list({worker:other})).documents.length,0);
assert.equal((await list({worker})).documents.length,9,'worker filter includes linked planilla rows and derived consultation');
const correction={...history.p,id:randomUUID(),requestId:randomUUID(),revision:0,finalize:true,correctionOf:history.doc.id,correctionReason:'Prueba de corrección',data:{...history.p.data,fields:{...history.p.data.fields,diagnosis:'Diagnóstico corregido'}}};
await save(correction);
const consultations=(await list({template:'consultas',status:'final'})).documents;
assert.equal(consultations.filter(d=>!d.superseded).length,2,'corrected history must replace its consultation in current reports');
assert.equal(consultations.filter(d=>d.superseded).length,1);
assert.equal((await list({template:'historia'})).documents.filter(d=>d.superseded).length,1);
await assert.rejects(save({...correction,id:randomUUID(),requestId:randomUUID()}),/corrección/);
await assert.rejects(save({...correction,id:randomUUID(),requestId:randomUUID(),workerId:other}),/Original/);
const consult=consultations.find(d=>d.source_document_id&&!d.superseded);
await assert.rejects(save({...correction,id:randomUUID(),requestId:randomUUID(),templateId:'consultas',workerId:null,correctionOf:consult.id,data:consult.data}),/Original/);
const pharmacy=input(catalog.getTemplate('farmacia'));
for(const bad of [{...pharmacy.data.rows[0],day1:'100'},{...pharmacy.data.rows[0],day31:'1'},{...pharmacy.data.rows[0],day1:'-1'}]){
 const p={...pharmacy,requestId:randomUUID(),data:{fields:{},rows:[bad]}};assert.throws(()=>validation.validateDocument(p));await assert.rejects(save(p));
}
const invalid=input(catalog.getTemplate('alcotest'));invalid.finalize=true;delete invalid.data.rows[0].workerId;
await assert.rejects(save(invalid));
// Alcotest review must preserve incomplete input as a draft before final validation.
const incompleteAlcotest={...invalid,finalize:false,requestId:randomUUID()};
incompleteAlcotest.data.rows[0].observations='Dato ficticio que debe conservarse';
const savedAlcotest=await save(incompleteAlcotest);
assert.doesNotThrow(()=>validation.validateDocument({...incompleteAlcotest,finalize:true}));
const reopenedAlcotest=(await list({template:'alcotest',status:'draft'})).documents.find(d=>d.id===savedAlcotest.id);
assert.deepEqual(reopenedAlcotest.data,incompleteAlcotest.data,'incomplete Alcotest survives a fresh history query');
const completedAlcotest={...incompleteAlcotest,revision:reopenedAlcotest.revision,requestId:randomUUID(),finalize:true,data:{...reopenedAlcotest.data,rows:reopenedAlcotest.data.rows.map(r=>({...r,workerId:worker}))}};
await save(completedAlcotest);
const reopenedFinal=(await list({template:'alcotest',status:'final'})).documents.find(d=>d.id===savedAlcotest.id);
assert.equal(reopenedFinal.status,'final');
assert.deepEqual(reopenedFinal.data,completedAlcotest.data,'completed Alcotest can be recovered from history');
const invalidDate=input(catalog.getTemplate('consultas'));invalidDate.data.rows[0].date='2026-08-01';await assert.rejects(save(invalidDate));
const missing=input(catalog.getTemplate('historia'));missing.finalize=true;missing.data.fields={};await assert.rejects(save(missing));
const draftEmpty={...missing,finalize:false,requestId:randomUUID()};assert.equal((await save(draftEmpty)).status,'draft');
await db.exec('reset role');await denied("update medical_documents set data='{}' where id=$1",[history.doc.id]);await denied('delete from medical_documents where id=$1',[history.doc.id]);
assert.ok((await db.query('select count(*)::int as n from medical_document_audit')).rows[0].n>30);
await db.exec("update medical_code_sessions set expires_at=now()-interval '1 second';set role anon");await assert.rejects(list({}));await assert.rejects(save(input(catalog.getTemplate('historia'))));
await db.close();console.log('OK: nueve plantillas, campos, borradores, concurrencia, finales inmutables, correcciones, consultas derivadas, filtros de trabajador, farmacia y permisos.');
