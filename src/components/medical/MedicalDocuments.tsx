'use client';
import { useEffect, useRef, useState } from 'react';
import { FileText, History, Plus, Save, Printer, ArrowLeft, Search, Check, X } from 'lucide-react';
import { templates, getTemplate, today, periodDate, daysInMonth, pharmacyRow, documentLabel, type Field, type MedicalDocument, type DocumentFilter } from '@/lib/medical/templates';
import { documentsApi, type DocumentsApi } from '@/lib/medical/document-api';
import { validateDocument, type SaveDocumentInput } from '@/lib/medical/document-validation';
import type { MedicalWorker } from '@/lib/medical/types';
import MedicalDocumentPrint from './MedicalDocumentPrint';

type WorkerSearch=(query:string)=>Promise<MedicalWorker[]>;
function WorkerPicker({search,onSelect,selected,filterOnly=false}:{search:WorkerSearch;onSelect:(w:MedicalWorker)=>void;selected?:string;filterOnly?:boolean}){
  const [query,setQuery]=useState('');const [workers,setWorkers]=useState<MedicalWorker[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  return <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2"><label className="text-xs font-bold text-[#002f6c]">Vincular con el padrón de trabajadores</label><p className="text-xs text-slate-600">{filterOnly?'Busca y selecciona al trabajador para filtrar su historial.':'Busca y selecciona al trabajador para poder finalizar. Escribir su nombre en los campos no lo vincula.'}</p>{selected&&<p className="text-sm font-bold">{selected}</p>}<div className="flex gap-2"><input aria-label="Buscar trabajador para formato" className="medical-input !mt-0" placeholder="Nombre o CI" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.parentElement?.querySelector('button')?.click();}}}/><button type="button" disabled={busy} className="medical-primary" onClick={async()=>{setBusy(true);setError('');try{const result=await search(query);setWorkers(result);if(!result.length)setError('No hay coincidencias.');}catch{setError('No se pudo buscar. Revisa tu sesión y conexión.');}finally{setBusy(false);}}}><Search size={15}/>{busy?'Buscando…':'Buscar'}</button></div>{error&&<p role="alert" className="text-red-700 text-xs">{error}</p>}{workers.length>0&&<div className="max-h-52 overflow-y-auto divide-y bg-white border rounded-lg">{workers.map(w=><button type="button" className="block text-left w-full p-3 hover:bg-blue-50 text-sm" key={w.id} onClick={()=>{onSelect(w);setWorkers([]);setQuery('');}}>{w.full_name} <span className="text-slate-500">· CI {w.ci}</span></button>)}</div>}</div>;
}
function InputField({field,value,onChange,disabled,calculated}:{field:Field;value:string;onChange:(value:string)=>void;disabled?:boolean;calculated?:boolean}){
  const props={value,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>onChange(e.target.value),disabled:disabled||calculated,className:'medical-input disabled:bg-slate-100',name:field.key};
  return <label className={`text-sm font-medium ${field.type==='textarea'?'md:col-span-2':''}`}>{field.label}{field.required&&<span className="text-red-600"> *</span>}{calculated&&<span className="text-xs text-slate-500"> · calculado</span>}{field.type==='textarea'?<textarea {...props} rows={3} maxLength={6000}/>:field.options?<select {...props}><option value="">Seleccionar</option>{field.options.map(o=><option key={o}>{o}</option>)}</select>:<input {...props} type={field.type||'text'} maxLength={6000} min={field.type==='number'?0:undefined} step={field.type==='number'?'any':undefined}/>}</label>;
}
function fillWorker(values:Record<string,string>,w:MedicalWorker){return {...values,fullName:w.full_name,ci:w.ci,occupation:w.position||'',department:w.department||''};}
function baseDocument(templateId:string,doctor:string,worker?:MedicalWorker):MedicalDocument {
  const t=getTemplate(templateId)!;const date=today();const period=t.period==='year'?date.slice(0,4)+'-01-01':t.period==='month'?date.slice(0,7)+'-01':date;
  const allowed=new Set(t.sections.flatMap(s=>s.fields.map(f=>f.key)));
  const defaults={date,doctor,kind:'Consulta',...(worker?fillWorker({},worker):{})};
  return {id:crypto.randomUUID(),template_id:templateId,worker_id:t.kind==='ficha'?worker?.id||null:null,worker_snapshot:t.kind==='ficha'&&worker?{...worker}:{},period,status:'draft',revision:0,data:{fields:Object.fromEntries(Object.entries(defaults).filter(([k])=>allowed.has(k))),rows:[]},author_name:doctor,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),finalized_at:null,correction_of:null,correction_reason:'',source_document_id:null};
}
export default function MedicalDocuments({doctor,search,api=documentsApi,initialWorker,initialTemplate,initialDocument,onDirty,onBusy}:{doctor:string;search:WorkerSearch;api?:DocumentsApi;initialWorker?:MedicalWorker;initialTemplate?:string;initialDocument?:MedicalDocument;onDirty:(v:boolean)=>void;onBusy:(v:boolean)=>void}){
  const [view,setView]=useState<'catalog'|'history'|'editor'>(initialTemplate||initialDocument?'editor':'catalog');
  const [doc,setDoc]=useState<MedicalDocument|undefined>(()=>initialDocument?structuredClone(initialDocument):initialTemplate?baseDocument(initialTemplate,doctor,initialWorker):undefined);
  const [dirty,setDirty]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [filter,setFilter]=useState<DocumentFilter>(initialWorker?{worker:initialWorker.id}:{});const [workerName,setWorkerName]=useState(initialWorker?.full_name||'');
  const [records,setRecords]=useState<MedicalDocument[]>([]);const [more,setMore]=useState(false);const [loadedFilter,setLoadedFilter]=useState<DocumentFilter>({});
  const [printing,setPrinting]=useState<MedicalDocument>();const [rowEditor,setRowEditor]=useState<{index:number;values:Record<string,string>}>();
  const [confirmFinal,setConfirmFinal]=useState(false);
  const pendingRequest=useRef<{signature:string;requestId:string}|undefined>(undefined);
  const latest=useRef(0);
  useEffect(()=>()=>{latest.current++;},[]);
  function mark(v:boolean){setDirty(v);onDirty(v);}
  function working(v:boolean){setBusy(v);onBusy(v);}
  function canLeave(){return !busy&&(!dirty||window.confirm('Hay cambios sin guardar. ¿Descartarlos?'));}
  function changeDoc(next:MedicalDocument){setDoc(next);mark(true);setError('');setNotice('');}
  function changeView(next:'catalog'|'history'){if(!canLeave())return;setView(next);setDoc(undefined);setRowEditor(undefined);mark(false);setError('');setNotice('');if(next==='history')void load(filter);}
  async function load(next:DocumentFilter,append=false){
    const seq=++latest.current;working(true);setError('');
    try{const result=await api.list(next);if(seq!==latest.current)return;setRecords(old=>append?[...old,...result.documents]:result.documents);setMore(result.more);setLoadedFilter(next);}
    catch(e){if(seq===latest.current)setError(e instanceof Error?e.message:'No se pudo cargar el historial.');}
    finally{if(seq===latest.current)working(false);}
  }
  function start(id:string){if(!canLeave())return;setDoc(baseDocument(id,doctor,initialWorker));setView('editor');setRowEditor(undefined);mark(false);setError('');setNotice('');}
  function payload(finalize:boolean):SaveDocumentInput {
    return {id:doc!.id,requestId:'',revision:doc!.revision,templateId:doc!.template_id,workerId:doc!.worker_id,period:doc!.period,finalize,correctionOf:doc!.correction_of,correctionReason:doc!.correction_reason,data:doc!.data};
  }
  async function save(finalize:boolean){
    if(!doc||busy||rowEditor)return false;
    setError('');setNotice('');
    try{
      const input=payload(finalize);input.data=validateDocument(input);
      const signature=JSON.stringify(input);
      if(pendingRequest.current?.signature!==signature)pendingRequest.current={signature,requestId:crypto.randomUUID()};
      input.requestId=pendingRequest.current.requestId;working(true);
      const result=await api.save(input);
      if(result.error||!result.document)throw new Error(result.error||'No se confirmó el guardado.');
      setDoc(result.document);mark(false);pendingRequest.current=undefined;
      setNotice(finalize?(doc.template_id==='historia'?'Historia finalizada. Se incorporó al Registro de Consultas.':'Documento finalizado. Ya puedes imprimirlo.'):api===documentsApi?'Borrador guardado. Puedes recuperarlo en Historial de formatos, incluso después de actualizar.':'Borrador de prueba guardado en esta vista previa. Se pierde al recargar.');
      setConfirmFinal(false);
      return true;
    }catch(e){setError(e instanceof Error?e.message:'No se confirmó el guardado.');setConfirmFinal(false);return false;}
    finally{working(false);}
  }
  async function reviewAndFinalize(){
    // Persist the editable version before final-only validation or confirmation.
    if(!await save(false))return;
    try{validateDocument(payload(true));setConfirmFinal(true);}
    catch(e){setError('El borrador quedó guardado. Para finalizar: '+(e instanceof Error?e.message:'revisa los campos.'));}
  }
  async function printPeriod(){
    const t=getTemplate(filter.template||'');if(!t||t.kind!=='planilla'){setError('Selecciona una plantilla de planilla para imprimir el periodo.');return;}
    if(!filter.from||!filter.to){setError('Indica desde y hasta para imprimir la planilla.');return;}
    working(true);setError('');
    try{
      let offset=0;let all:MedicalDocument[]=[];
      for(;;){const r=await api.list({...filter,status:'final',offset});all=all.concat(r.documents.filter(d=>!d.superseded));if(all.reduce((n,d)=>n+d.data.rows.length,0)>1000)throw new Error('La selección supera 1.000 filas. Reduce el periodo para imprimir.');if(!r.more)break;offset+=50;}
      if(!all.length)throw new Error('No hay documentos finales para este periodo.');
      if(new Set(all.map(d=>d.period)).size!==1)throw new Error('Selecciona un solo mes o año de esta planilla para conservar el encabezado correcto.');
      if(new Set(all.map(d=>JSON.stringify(d.data.fields))).size>1)throw new Error('Las planillas tienen encabezados u observaciones diferentes. Imprime cada documento para conservar esos datos.');
      const chronological=[...all].reverse();
      setPrinting({...all[0],id:'consolidado-'+all[0].period,correction_of:null,correction_reason:'',source_document_id:null,author_name:'Consolidado de '+all.length+' documentos',data:{fields:all[0].data.fields,rows:chronological.flatMap(d=>d.data.rows)}});
    }catch(e){setError(e instanceof Error?e.message:'No se pudo preparar la planilla.');}finally{working(false);}
  }
  const template=doc?getTemplate(doc.template_id):undefined;
  const locked=busy||doc?.status==='final';
  const columns=template?.columns?.filter(f=>template.id!=='farmacia'||!f.key.startsWith('day')||Number(f.key.slice(3))<=daysInMonth(doc!.period))||[];
  return <section className="medical-documents space-y-5">
    <div className="flex flex-wrap justify-between items-center gap-3"><div><h1 className="text-2xl font-black text-[#002f6c]">Formatos médicos ENDE</h1><p className="text-sm text-slate-500">Nueve plantillas · Borradores editables · Historial e impresión</p></div><div className="flex gap-2"><button disabled={busy} onClick={()=>changeView('catalog')} className="medical-primary"><FileText size={16}/> Plantillas</button><button disabled={busy} onClick={()=>changeView('history')} className="border rounded-xl bg-white px-4 py-2 text-sm font-bold flex items-center gap-2"><History size={16}/> Historial de formatos</button></div></div>
    {view!=='editor'&&error&&<div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl">{error}</div>}{view!=='editor'&&notice&&<div role="status" className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl">{notice}</div>}
    {initialWorker&&<p className="text-sm text-blue-900 bg-blue-50 border border-blue-100 rounded-xl p-3">Trabajador seleccionado: <b>{initialWorker.full_name}</b>. El historial se filtra por este trabajador.</p>}
    {view==='catalog'&&<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{templates.map((t,i)=><button key={t.id} onClick={()=>start(t.id)} className="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-500 shadow-sm"><span className="inline-flex bg-blue-50 text-blue-800 rounded-lg p-2 text-xs font-bold">{String(i+1).padStart(2,'0')} · {t.kind==='ficha'?'Ficha individual':'Planilla'}</span><h2 className="font-black text-[#002f6c] mt-4">{t.title}</h2><p className="text-sm text-slate-500 mt-2">{t.description}</p>{t.code&&<p className="text-xs text-slate-400 mt-2">{t.code}</p>}</button>)}</div>}
    {view==='history'&&<>
      <div className="bg-white rounded-2xl border p-5 space-y-4"><div className="grid md:grid-cols-4 gap-3"><label className="text-sm font-bold">Plantilla<select className="medical-input" value={filter.template||''} onChange={e=>setFilter({...filter,template:e.target.value||undefined})}><option value="">Todas las plantillas</option>{templates.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label className="text-sm font-bold">Estado<select className="medical-input" value={filter.status||''} onChange={e=>setFilter({...filter,status:e.target.value||undefined})}><option value="">Borradores y finales</option><option value="draft">Borradores</option><option value="final">Finalizados</option></select></label><label className="text-sm font-bold">Periodo desde<input type="date" className="medical-input" value={filter.from||''} onChange={e=>setFilter({...filter,from:e.target.value||undefined})}/></label><label className="text-sm font-bold">Periodo hasta<input type="date" className="medical-input" value={filter.to||''} onChange={e=>setFilter({...filter,to:e.target.value||undefined})}/></label></div>
      <WorkerPicker filterOnly search={search} selected={workerName} onSelect={w=>{setFilter({...filter,worker:w.id});setWorkerName(w.full_name);}}/>{filter.worker&&<button className="text-blue-700 text-xs underline" onClick={()=>{setFilter({...filter,worker:undefined});setWorkerName('');}}>Quitar filtro de trabajador</button>}
      <p className="text-xs text-slate-500">Las planillas mensuales se buscan por el primer día del mes; las anuales, por el 1 de enero. Las versiones anteriores se conservan y se marcan como corregidas.</p><div className="flex flex-wrap gap-3"><button disabled={busy} className="medical-primary" onClick={()=>{if(filter.from&&filter.to&&filter.from>filter.to){setError('Revisa el rango de fechas.');return;}void load({...filter,offset:0});}}>{busy?'Cargando…':'Buscar registros'}</button><button disabled={busy} className="border rounded-xl px-4 py-2 text-sm font-bold" onClick={()=>void printPeriod()}>Imprimir planilla del periodo</button></div></div>
      <div className="bg-white border rounded-2xl divide-y">{!records.length&&!busy&&<p className="p-6 text-slate-500">No hay documentos cargados. Usa Buscar registros para consultar los filtros.</p>}{records.map(d=><div key={d.id} className="p-4 flex flex-wrap justify-between items-center gap-3"><div><p className="font-bold">{getTemplate(d.template_id)?.title}</p><p className="text-sm text-slate-500">{documentLabel(d)} · {d.period} · {d.author_name}</p><p className="text-xs mt-1 text-blue-800">{d.status==='draft'?'Borrador editable':'Finalizado'} · v{d.revision}{d.superseded?' · Corregido (versión anterior)':''}{d.source_document_id?' · Desde historia clínica':''}</p></div><button disabled={busy} className="border rounded-lg px-4 py-2 text-sm font-bold text-blue-800" onClick={()=>{setDoc(structuredClone(d));setView('editor');mark(false);setError('');setNotice('');}}>Abrir</button></div>)}</div>{more&&<button disabled={busy} className="medical-primary" onClick={()=>void load({...loadedFilter,offset:(loadedFilter.offset||0)+50},true)}>Cargar más</button>}
    </>}
    {view==='editor'&&doc&&template&&<>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <header className="bg-[#002f6c] text-white p-5 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_ende_deoruro.png" alt="ENDE DEORURO" className="w-24 bg-white rounded-xl p-2"/><div><p className="text-xs text-amber-300 font-bold">SEGURIDAD INDUSTRIAL Y SALUD OCUPACIONAL</p><h2 className="font-black text-xl mt-1">{template.title}</h2><p className="text-xs mt-2">{template.code?template.code+' · ':''}{doc.status==='draft'?'BORRADOR':'FINALIZADO'} · {doc.revision?'Versión '+doc.revision:'Sin guardar'}</p></div>
        </header>
        <div className="p-5 space-y-5">
          {doc.source_document_id&&<p className="bg-blue-50 p-3 text-sm rounded-xl">Este registro se generó desde una historia clínica. Las correcciones se realizan en la historia original ({doc.source_document_id.slice(0,8)}).</p>}
          {doc.superseded&&<p className="bg-amber-50 p-3 text-sm rounded-xl">Versión anterior: existe una corrección final posterior.</p>}
          <div className="flex flex-wrap items-end gap-4"><label className="text-sm font-bold">{template.period==='date'?'Fecha del documento':template.period==='month'?'Mes de la planilla':'Año de la planilla'}<input className="medical-input" disabled={locked} type={template.period==='year'?'number':template.period==='month'?'month':'date'} min={template.period==='year'?1900:undefined} max={template.period==='year'?2200:undefined} value={template.period==='year'?doc.period.slice(0,4):template.period==='month'?doc.period.slice(0,7):doc.period} onChange={e=>{if(!e.target.value)return;const p=periodDate(e.target.value);changeDoc({...doc,period:p,data:{...doc.data,fields:template.sections.some(s=>s.fields.some(f=>f.key==='date'))?{...doc.data.fields,date:p}:doc.data.fields}});}}/></label><p className="text-xs text-slate-500">Los campos con * se completan al finalizar. Puedes guardar un borrador incompleto.</p></div>
          {template.kind==='ficha'&&!locked&&<WorkerPicker search={search} selected={doc.worker_snapshot.full_name} onSelect={w=>{const allowed=new Set(template.sections.flatMap(s=>s.fields.map(f=>f.key)));changeDoc({...doc,worker_id:w.id,worker_snapshot:{...w},data:{...doc.data,fields:Object.fromEntries(Object.entries(fillWorker(doc.data.fields,w)).filter(([k])=>allowed.has(k)))}});}}/>}
          {template.kind==='ficha'&&locked&&<p className="font-bold text-sm">{doc.worker_snapshot.full_name} · CI {doc.worker_snapshot.ci}</p>}
          {doc.correction_of&&<label className="block text-sm font-bold text-amber-800">Motivo de la corrección *<textarea className="medical-input" disabled={locked} value={doc.correction_reason} onChange={e=>changeDoc({...doc,correction_reason:e.target.value})}/></label>}
          {template.sections.map(s=><section key={s.title} className="border rounded-xl overflow-hidden"><h3 className="bg-blue-50 border-b p-3 text-[#002f6c] font-bold">{s.title}</h3><div className="p-4 grid md:grid-cols-2 gap-4">{s.fields.map(f=><InputField key={f.key} field={f} value={doc.data.fields[f.key]||''} disabled={locked} onChange={v=>changeDoc({...doc,period:f.key==='date'&&v?v:doc.period,data:{...doc.data,fields:{...doc.data.fields,[f.key]:v}}})}/>)}</div></section>)}
          {template.kind==='planilla'&&<section className="space-y-3"><div className="flex justify-between items-center"><h3 className="font-bold">Registros de la planilla ({doc.data.rows.length}/100)</h3>{!locked&&<button disabled={doc.data.rows.length>=100} className="medical-primary" onClick={()=>{const vals:Record<string,string>={};if(columns.some(f=>f.key==='date'))vals.date=doc.period;if(template.id==='consultas')vals.kind='Consulta';setRowEditor({index:doc.data.rows.length,values:vals});mark(true);}}><Plus size={16}/> Añadir fila</button>}</div><div className="overflow-x-auto border rounded-xl"><table className="text-xs w-full border-collapse"><thead className="bg-blue-50"><tr><th className="p-3">N°</th>{template.id!=='farmacia'&&<th className="p-3 min-w-48">Trabajador vinculado</th>}{columns.map(f=><th key={f.key} className="p-3 min-w-28 text-left border-l">{f.label}</th>)}{!locked&&<th className="p-3">Acciones</th>}</tr></thead><tbody>{doc.data.rows.map((raw,i)=>{const r=template.id==='farmacia'?pharmacyRow(raw,doc.period):raw;return <tr key={i} className="border-t"><td className="p-3">{i+1}</td>{template.id!=='farmacia'&&<td className="p-3">{r.fullName||'Sin vincular'}</td>}{columns.map(f=><td key={f.key} className="p-3 border-l whitespace-pre-wrap max-w-64 break-words">{r[f.key]||'—'}</td>)}{!locked&&<td className="p-3"><button className="text-blue-700 font-bold" onClick={()=>{setRowEditor({index:i,values:{...raw}});}}>Editar fila {i+1}</button><button className="block text-red-600 mt-2" onClick={()=>{if(window.confirm('¿Quitar esta fila del borrador?'))changeDoc({...doc,data:{...doc.data,rows:doc.data.rows.filter((_,j)=>j!==i)}});}}>Quitar</button></td>}</tr>;})}</tbody></table></div>{!doc.data.rows.length&&<p className="text-sm text-slate-500">Añade una fila para comenzar.</p>}</section>}
          {template.note&&<p className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-sm">{template.note}</p>}
          {(template.signatures||columns.some(f=>/signature/i.test(f.key)))&&<p className="text-xs text-slate-500">La impresión conserva los espacios de firma. Escribir un nombre no sustituye una firma manuscrita o electrónica.</p>}
        </div>
      </div>
      <div className="sticky bottom-0 bg-white/95 border rounded-xl p-4 flex flex-wrap gap-3 items-center shadow-lg">
        {error&&<div role="alert" className="w-full bg-red-50 text-red-800 p-3 rounded-lg">{error}</div>}
        {notice&&!error&&<div role="status" className="w-full bg-green-50 text-green-800 p-3 rounded-lg">{notice}</div>}
        <button disabled={busy} onClick={()=>changeView('catalog')} className="border rounded-xl px-3 py-2 text-sm flex gap-2"><ArrowLeft size={16}/> Volver</button>
        {doc.status==='draft'&&<><button disabled={busy||!!rowEditor} className="medical-primary" onClick={()=>void save(false)}><Save size={16}/>{busy?'Guardando…':'Guardar borrador'}</button><button disabled={busy||!!rowEditor} className="border border-blue-800 text-blue-900 rounded-xl px-4 py-2 font-bold text-sm" onClick={()=>void reviewAndFinalize()}><Check size={16} className="inline mr-1"/> Revisar y finalizar</button></>}
        <button disabled={busy||!!rowEditor} className="border rounded-xl px-4 py-2 text-sm font-bold flex gap-2" onClick={()=>setPrinting(doc)}><Printer size={16}/> Vista previa / PDF</button>
        {doc.status==='final'&&!doc.source_document_id&&!doc.superseded&&<button disabled={busy} className="text-amber-800 border border-amber-300 rounded-xl px-4 py-2 text-sm font-bold" onClick={()=>{changeDoc({...doc,id:crypto.randomUUID(),revision:0,status:'draft',finalized_at:null,correction_of:doc.id,correction_reason:'',source_document_id:null,superseded:false});}}>Crear corrección</button>}
        <span className="text-xs text-slate-500">{dirty?'Cambios sin guardar':doc.revision?'Guardado':'Nuevo documento'}</span>
      </div>
    </>}
    {rowEditor&&doc&&template&&<div className="fixed inset-0 bg-slate-950/60 z-40 overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="Editar fila de planilla"><div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl my-4"><header className="p-5 bg-[#002f6c] text-white rounded-t-2xl flex justify-between"><h2 className="font-bold">{template.title} · Fila {rowEditor.index+1}</h2><button aria-label="Cerrar edición de fila" onClick={()=>{if(window.confirm('¿Cerrar sin aplicar los cambios de esta fila?'))setRowEditor(undefined);}}><X/></button></header><div className="p-5 space-y-5">{template.id!=='farmacia'&&<WorkerPicker search={search} selected={rowEditor.values.fullName} onSelect={w=>{const allowed=new Set([...columns.map(f=>f.key),'workerId','fullName','ci']);setRowEditor({...rowEditor,values:Object.fromEntries(Object.entries({...fillWorker(rowEditor.values,w),workerId:w.id}).filter(([k])=>allowed.has(k)))});mark(true);}}/>}<div className="grid md:grid-cols-2 gap-4">{columns.map(f=><InputField key={f.key} field={f} value={(template.id==='farmacia'?pharmacyRow(rowEditor.values,doc.period):rowEditor.values)[f.key]||''} calculated={template.id==='farmacia'&&['used','balance'].includes(f.key)} onChange={v=>{setRowEditor({...rowEditor,values:{...rowEditor.values,[f.key]:v}});mark(true);}}/>)}</div><button className="medical-primary" onClick={()=>{const rows=[...doc.data.rows];rows[rowEditor.index]=template.id==='farmacia'?pharmacyRow(rowEditor.values,doc.period):rowEditor.values;changeDoc({...doc,data:{...doc.data,rows}});setRowEditor(undefined);}}>Aplicar fila al borrador</button><p className="text-xs text-slate-500">Después utiliza Guardar borrador para conservar la planilla.</p></div></div></div>}
    {confirmFinal&&doc&&<div className="fixed inset-0 bg-slate-950/60 z-40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Confirmar finalización"><div className="max-w-lg bg-white rounded-2xl p-6 space-y-4"><h2 className="font-black text-xl text-[#002f6c]">Finalizar {getTemplate(doc.template_id)?.title}</h2><p>El borrador ya está guardado en Historial de formatos. Confirma para finalizarlo. Los cambios posteriores se registrarán como correcciones, manteniendo esta versión.</p><p className="text-sm">{documentLabel(doc)} · {doc.period}</p><div className="flex gap-3"><button disabled={busy} className="border rounded-xl px-4 py-2" onClick={()=>setConfirmFinal(false)}>Seguir revisando</button><button disabled={busy} className="medical-primary" onClick={()=>void save(true)}>{busy?'Guardando…':'Finalizar documento'}</button></div></div></div>}
    {printing&&<MedicalDocumentPrint doc={printing} onClose={()=>setPrinting(undefined)}/>}
  </section>;
}
