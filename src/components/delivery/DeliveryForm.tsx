'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileCheck2, KeyRound, Plus, Trash2, Printer, Save, FolderOpen, LogOut, History } from 'lucide-react';
import { draftSchema, savedDeliverySchema, type Draft, type Item, type DeliverySummary } from '@/lib/delivery';
import Swal from 'sweetalert2';
import { checkDeliveryCode, saveDelivery, listDeliveries, readDelivery, deleteDelivery, logoutDelivery } from '@/app/entrega/actions';
import './delivery.css';
import DeliveryWorkerPicker from './DeliveryWorkerPicker';

const storageKey='ende-delivery-draft-v1';
const newItem=():Item=>({id:crypto.randomUUID(),category:'Herramientas',description:'',quantity:'1',unit:'Pza',condition:'Nuevo',identification:''});
const emptyDraft=():Draft=>({reference:'',date:new Intl.DateTimeFormat('sv-SE',{timeZone:'America/La_Paz'}).format(new Date()),location:'',area:'',reason:'',observations:'',receipt:'Recibido conforme',items:[newItem()]});

export default function DeliveryForm(){
  const [allowed,setAllowed]=useState(false);
  const [pin,setPin]=useState('');
  const [checking,setChecking]=useState(false);
  const [draft,setDraft]=useState<Draft|null>(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [dirty,setDirty]=useState(false);
  const [recordId,setRecordId]=useState('');
  const [revision,setRevision]=useState(0);
  const [busy,setBusy]=useState(false);
  const [view,setView]=useState<'form'|'history'>('form');
  const [history,setHistory]=useState<DeliverySummary[]>([]);
  const [historyError,setHistoryError]=useState('');
  const [hasMore,setHasMore]=useState(false);
  async function alertError(message:string){await Swal.fire({icon:'error',title:'No se completó la operación',text:message,confirmButtonColor:'#002f6c'});}
  async function canLeave(){return !dirty||(await Swal.fire({icon:'warning',title:'Hay cambios sin guardar',text:'¿Continuar sin guardar estos cambios?',showCancelButton:true,confirmButtonText:'Continuar',cancelButtonText:'Volver',confirmButtonColor:'#002f6c'})).isConfirmed;}
  async function refreshHistory(append=false){
    const res=await listDeliveries(append?history.length:0);
    if(res.error){setHistoryError(res.error);return;}
    setHistoryError('');setHistory(prev=>append?[...prev,...res.rows!]:res.rows!);setHasMore(res.rows!.length===50);
  }
  async function showHistory(){if(busy||!await canLeave())return;setDirty(false);setView('history');setBusy(true);try{await refreshHistory();}catch{setHistoryError('No se pudo cargar el historial. Intenta nuevamente.');}finally{setBusy(false);}}
  async function openRecord(id:string){if(busy)return;setBusy(true);try{const res=await readDelivery(id);if(res.error||!res.record){await alertError(res.error||'Entrega no disponible.');return;}const parsed=draftSchema.parse(res.record.data);setDraft(parsed);setRecordId(res.record.id);setRevision(res.record.revision);setDraft(draftSchema.parse(res.record.data));setDirty(false);setError('');setMessage('Entrega recuperada del historial.');setView('form');}catch{await alertError('No se pudo abrir la entrega. Intenta nuevamente.');}finally{setBusy(false);}}
  async function removeRecord(row:DeliverySummary){
    if(busy)return;
    const confirm=await Swal.fire({icon:'warning',title:'¿Eliminar esta entrega?',text:`Se retirará del historial la entrega del ${row.date} para ${row.area}.`,showCancelButton:true,confirmButtonText:'Sí, eliminar',cancelButtonText:'Cancelar',confirmButtonColor:'#b91c1c'});
    if(!confirm.isConfirmed)return;setBusy(true);
    try{const res=await deleteDelivery(row.id,row.revision);if(res.error){await alertError(res.error);return;}if(recordId===row.id){setRecordId(crypto.randomUUID());setRevision(0);setDraft(emptyDraft());setDirty(false);}await refreshHistory();await Swal.fire({icon:'success',title:'Entrega eliminada',text:'Se retiró del historial.',confirmButtonColor:'#002f6c'});}catch{await alertError('No se pudo eliminar la entrega. Intenta nuevamente.');}finally{setBusy(false);}
  }
  async function newDelivery(){if(busy||!await canLeave())return;setDraft(emptyDraft());setRecordId(crypto.randomUUID());setRevision(0);setDirty(false);setError('');setMessage('');setView('form');}

  useEffect(()=>{if(!dirty)return;const guard=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
  function change<K extends keyof Draft>(key:K,value:Draft[K]){setDraft(d=>d?{...d,[key]:value}:d);setDirty(true);setMessage('');}
  function changeItem<K extends keyof Item>(id:string,key:K,value:Item[K]){if(draft)change('items',draft.items.map(i=>i.id===id?{...i,[key]:value}:i));}
  function restore(){
    if(dirty&&!window.confirm('¿Reemplazar los cambios actuales con el borrador guardado?'))return;
    try{const saved=localStorage.getItem(storageKey);if(!saved){setMessage('No hay un borrador guardado en este navegador.');return;}setDraft(draftSchema.parse(JSON.parse(saved)));setRecordId(crypto.randomUUID());setRevision(0);setView('form');setDirty(true);setError('');setMessage('Borrador recuperado. Revisa los datos antes de imprimir.');}
    catch{setError('No se pudo recuperar el borrador. Puedes seguir llenando el formulario.');}
  }
  async function save(){
    if(busy||!draft)return;
    if(!draft.worker&&revision===0){await alertError('Selecciona un trabajador o registra uno nuevo.');return;}
    const checked=savedDeliverySchema.safeParse(draft);
    if(!checked.success){await alertError(checked.error.issues[0].message);return;}
    setBusy(true);void Swal.fire({title:'Guardando entrega',text:'Espera mientras se guarda en la base de datos.',allowOutsideClick:false,allowEscapeKey:false,didOpen:()=>Swal.showLoading()});
    try{const res=await saveDelivery(recordId,revision,checked.data);Swal.close();if(res.error||!res.record){await alertError(res.error||'No se pudo guardar.');return;}setRevision(res.record.revision);setDraft(draftSchema.parse(res.record.data));setDirty(false);setError('');setMessage('Entrega guardada en la base de datos.');await Swal.fire({icon:'success',title:'Entrega guardada',text:'Ya está disponible en el historial de entregas. Las firmas se recogen en el acta impresa.',confirmButtonColor:'#002f6c'});}catch{Swal.close();await alertError('No se pudo confirmar el guardado. Intenta nuevamente; no se duplicará la entrega.');}finally{setBusy(false);}
  }

  function print(){
    if(!draft)return;
    if(!draft.worker&&revision===0){setError('Selecciona un trabajador o registra uno nuevo antes de imprimir.');return;}
    if(!draft.date||!draft.area.trim()){setError('Completa la fecha y el área antes de imprimir.');return;}
    if(draft.items.some(i=>!i.description.trim()||!Number.isFinite(Number(i.quantity))||Number(i.quantity)<=0)){setError('Cada ítem debe tener una descripción y una cantidad mayor que cero.');return;}
    if((draft.receipt==='Recibido con observaciones'||draft.items.some(i=>i.condition==='Con observaciones'))&&!draft.observations.trim()){setError('Detalla las observaciones de la entrega.');return;}
    setError('');window.print();
  }
  const field=(key:Exclude<keyof Draft,'items'|'receipt'|'worker'>,label:string,required=false,type='text')=><label className="delivery-field" key={key}>{label}{required?' *':''}<input type={type} required={required} maxLength={key==='reason'?3000:200} value={draft?.[key]||''} onChange={e=>change(key,type==='date'?e.target.value:e.target.value.toLocaleUpperCase('es'))}/></label>;

  if(!allowed||!draft)return <main className="delivery-login"><form onSubmit={async e=>{e.preventDefault();setChecking(true);setError('');try{if(await checkDeliveryCode(pin)){setDraft(emptyDraft());setRecordId(crypto.randomUUID());setRevision(0);setView('form');setAllowed(true);setPin('');}else setError('Clave incorrecta.');}catch{setError('No se pudo verificar la clave. Intenta nuevamente.');}finally{setChecking(false);}}}>
    
    <Image unoptimized src="/logo_ende_deoruro.png" alt="ENDE DEORURO" width={130} height={70}/>
    <span className="delivery-tag">SEGURIDAD INDUSTRIAL</span><h1>Entrega de herramientas y EPP</h1><p>Acta con visto bueno, conformidad del supervisor y recepción.</p>
    <label className="delivery-field">Clave de acceso<input autoComplete="off" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value)} required/></label>
    {error&&<p role="alert" className="delivery-error">{error}</p>}<button disabled={checking} className="delivery-primary"><KeyRound size={18}/>{checking?'Verificando…':'Ingresar al acta'}</button><Link href="/">Volver al sistema principal</Link>
  </form></main>;

  return <main className="delivery-page">
    <div className="delivery-editor">
      <header className="delivery-header"><div><Image unoptimized src="/logo_ende_deoruro.png" alt="ENDE DEORURO" width={100} height={60}/><div><span className="delivery-tag">ACTA DE ENTREGA</span><h1>Herramientas y EPP</h1><p>Llenado libre · Visto bueno · Conformidad · Recepción</p></div></div><button className="delivery-secondary" disabled={busy} onClick={async()=>{if(!await canLeave())return;await logoutDelivery();setHistory([]);setAllowed(false);setDraft(null);setMessage('');setError('');setDirty(false);}}><LogOut size={17}/> Salir</button></header>
      <fieldset disabled={busy}><div className="delivery-notice"><b>Documento pendiente de firmas.</b> Selecciona al trabajador del padrón compartido. Quien entrega y el supervisor se identificarán con sus sellos y firmas en el acta impresa. Este formulario no descuenta materiales del almacén.</div>
      <div className="delivery-actions"><button className="delivery-secondary" onClick={newDelivery}><Plus size={17}/> Nueva entrega</button><button className="delivery-secondary" onClick={showHistory}><History size={17}/> Historial de entregas</button>{view==='form'&&<><button className="delivery-primary" onClick={save}><Save size={17}/> {revision?'Guardar cambios':'Guardar entrega'}</button><button className="delivery-secondary" onClick={restore}><FolderOpen size={17}/> Recuperar borrador local anterior</button><button className="delivery-secondary" onClick={print}><Printer size={17}/> Imprimir / PDF</button></>}</div>
      {view==='history'&&<section className="delivery-card"><h2><History/> Historial de entregas</h2>{busy&&<p role="status">Cargando…</p>}{historyError?<div role="alert" className="delivery-error">{historyError}<button className="delivery-secondary" onClick={showHistory}>Reintentar</button></div>:!history.length&&!busy?<p>Todavía no hay entregas guardadas.</p>:history.map(row=><div className="delivery-history-row" key={row.id}><div><b>{row.area}</b><p>{row.date} · {row.item_count} ítems{row.reference?' · Ref. '+row.reference:''}</p></div><div className="delivery-actions"><button className="delivery-secondary" onClick={()=>openRecord(row.id)}>Abrir / Editar</button><button className="delivery-delete" aria-label={'Eliminar entrega de '+row.area+' del '+row.date} onClick={()=>removeRecord(row)}><Trash2 size={18}/></button></div></div>)}{hasMore&&!historyError&&<button className="delivery-secondary" onClick={async()=>{setBusy(true);try{await refreshHistory(true);}catch{setHistoryError('No se pudo cargar más entregas.');}finally{setBusy(false);}}}>Cargar más</button>}</section>}
      <div hidden={view!=='form'}>
      {message&&<p role="status" className="delivery-notice">{message}</p>}{error&&<p role="alert" className="delivery-error">{error}</p>}
      <DeliveryWorkerPicker key={recordId+'-'+view} worker={draft.worker} onBusy={setBusy} onSelect={worker=>{setDraft(d=>d?{...d,worker,area:d.area||worker?.department||''}:d);setDirty(true);setMessage('');}}/>
      <section className="delivery-card"><h2><FileCheck2/> 2. Datos de la entrega</h2><div className="delivery-grid">{field('date','Fecha',true,'date')}{field('area','Área',true)}</div><details><summary className="cursor-pointer text-sm font-bold">Otros datos (opcional)</summary><div className="delivery-grid mt-4">{field('reference','N.º de referencia')}{field('location','Lugar')}</div>{field('reason','Motivo de la entrega')}</details></section>
      <section className="delivery-card"><div className="delivery-section-title"><h2>3. Detalle de herramientas y EPP</h2><button className="delivery-secondary" disabled={draft.items.length>=100} onClick={()=>change('items',[...draft.items,newItem()])}><Plus size={17}/> Agregar ítem</button></div>
        {draft.items.map((item,n)=><div className="delivery-item" key={item.id}><div className="delivery-section-title"><b>Ítem {n+1}</b><button className="delivery-delete" disabled={draft.items.length===1} aria-label={`Eliminar ítem ${n+1}`} onClick={()=>change('items',draft.items.filter(i=>i.id!==item.id))}><Trash2 size={18}/></button></div><div className="delivery-item-grid">
          <label className="delivery-field">Categoría<select value={item.category} onChange={e=>changeItem(item.id,'category',e.target.value as Item['category'])}><option>Herramientas</option><option>EPP</option></select></label>
          <label className="delivery-field">Descripción *<input maxLength={1000} value={item.description} onChange={e=>changeItem(item.id,'description',e.target.value.toLocaleUpperCase('es'))}/></label>
          <label className="delivery-field">Cantidad *<input type="number" min="0.01" step="any" value={item.quantity} onChange={e=>changeItem(item.id,'quantity',e.target.value)}/></label>
          <label className="delivery-field">Unidad<select value={item.unit} onChange={e=>changeItem(item.id,'unit',e.target.value as Item['unit'])}><option>Pza</option><option>Par</option><option>Metros</option></select></label>
          <label className="delivery-field">Estado<select value={item.condition} onChange={e=>changeItem(item.id,'condition',e.target.value as Item['condition'])}><option>Nuevo</option><option>Usado en buen estado</option><option>Con observaciones</option></select></label>
        </div><label className="delivery-field">Marca, modelo, serie / código de activo y accesorios<input maxLength={500} value={item.identification} onChange={e=>changeItem(item.id,'identification',e.target.value.toLocaleUpperCase('es'))}/></label></div>)}
      </section>
      <section className="delivery-card"><h2>4. Recepción y observaciones</h2><label className="delivery-field">Conformidad de recepción<select value={draft.receipt} onChange={e=>change('receipt',e.target.value as Draft['receipt'])}><option>Recibido conforme</option><option>Recibido con observaciones</option></select></label><label className="delivery-field">Observaciones de entrega y recepción<textarea rows={4} maxLength={5000} value={draft.observations} onChange={e=>change('observations',e.target.value.toLocaleUpperCase('es'))}/></label><p>Los faltantes, daños o incidentes anteriores deben detallarse; no se consideran entregados por llenar este documento.</p></section>
      <div className="delivery-actions"><button className="delivery-secondary" onClick={save}><Save size={17}/> {revision?'Guardar cambios':'Guardar entrega'}</button><button className="delivery-primary" onClick={print}><Printer size={17}/> Imprimir / PDF</button></div>
      </div></fieldset>
    </div>
    <article className="delivery-print print-area">
      <header><Image unoptimized src="/logo_ende_deoruro.png" alt="ENDE DEORURO" width={100} height={60}/><div><h1>ACTA DE ENTREGA DE HERRAMIENTAS Y EPP</h1><p>SEGURIDAD INDUSTRIAL Y SALUD OCUPACIONAL</p></div></header>
      <p><b>Fecha:</b> {draft.date.split('-').reverse().join('/')} · <b>Área:</b> {draft.area}</p>{draft.reference&&<p><b>Referencia:</b> {draft.reference}</p>}{draft.location&&<p><b>Lugar:</b> {draft.location}</p>}
      {draft.worker&&<p><b>Trabajador:</b> {draft.worker.fullName} · <b>CI:</b> {draft.worker.ci||'—'}{draft.worker.position&&<> · <b>Cargo:</b> {draft.worker.position}</>}{draft.worker.department&&<> · <b>Área del trabajador:</b> {draft.worker.department}</>}</p>}
      {draft.reason&&<p><b>Motivo:</b> {draft.reason}</p>}
      <table><thead><tr><th>N.º</th><th>Herramienta / EPP e identificación</th><th>Cantidad</th><th>Unidad</th><th>Estado</th></tr></thead><tbody>{draft.items.map((i,n)=><tr key={i.id}><td>{n+1}</td><td><b>{i.description}</b><br/>{i.category}{i.identification&&<><br/>{i.identification}</>}</td><td>{i.quantity}</td><td>{i.unit}</td><td>{i.condition}</td></tr>)}</tbody></table>
      <p><b>Recepción:</b> {draft.receipt}</p><p className="delivery-print-observations"><b>Observaciones:</b> {draft.observations||'SIN OBSERVACIONES'}</p>
      <p>Se deja constancia de la entrega y recepción de los elementos detallados, en las cantidades y condiciones indicadas. La firma de Seguridad Industrial deja constancia de la entrega; la conformidad del supervisor corresponde a la asignación en su área. Quien recibe deja constancia de la recepción mediante su firma, incluyendo las observaciones consignadas.</p>
      <div className="delivery-signatures">{[['ENTREGUÉ CONFORME','Seguridad Industrial'],['CONFORMIDAD','Supervisor de área'],[draft.receipt==='Recibido con observaciones'?'RECIBÍ CON OBSERVACIONES':'RECIBÍ CONFORME','Recepción']].map(([title,detail])=><div key={title}><div className="delivery-sign-line"/><strong>{title}</strong><span>{detail}</span></div>)}</div>
      <p className="delivery-print-note">El llenado de este documento no sustituye las firmas. Cualquier pérdida o incidente posterior se documentará por separado con referencia a esta entrega.</p>
    </article>
  </main>;
}
