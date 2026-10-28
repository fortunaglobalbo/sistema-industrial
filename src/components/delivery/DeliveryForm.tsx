'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileCheck2, KeyRound, Plus, Trash2, Printer, Save, FolderOpen, LogOut, History } from 'lucide-react';
import { draftSchema, savedDeliverySchema, type Draft, type Item, type DeliverySummary } from '@/lib/delivery';
import Swal from 'sweetalert2';
import { checkDeliveryCode, saveDelivery, inspectDelivery, deleteDelivery, permanentlyDeleteDelivery, logoutDelivery } from '@/app/entrega/actions';
import './delivery.css';
import ImportMaterials from './ImportMaterials';
import DeliveryHistory from './DeliveryHistory';
import DescriptionInput from './DescriptionInput';
import {downloadDeliveryExcel} from '@/lib/deliveryExcel';
import DeliveryWorkerPicker from './DeliveryWorkerPicker';

const storageKey='ende-delivery-draft-v1';
const newItem=():Item=>({id:crypto.randomUUID(),category:'Herramientas',description:'',quantity:'1',unit:'Pza',condition:'Nuevo',identification:''});
const emptyDraft=():Draft=>({kind:'ENT',registeredBy:'',reference:'',date:new Intl.DateTimeFormat('sv-SE',{timeZone:'America/La_Paz'}).format(new Date()),location:'',area:'',reason:'',observations:'',receipt:'Recibido conforme',items:[newItem()]});

export default function DeliveryForm({supervision=false}:{supervision?:boolean}){
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
  const [folio,setFolio]=useState('');
  const [cancelled,setCancelled]=useState(false);
  async function alertError(message:string){await Swal.fire({icon:'error',title:'No se completó la operación',text:message,confirmButtonColor:'#002f6c'});}
  async function canLeave(){return !dirty||(await Swal.fire({icon:'warning',title:'Hay cambios sin guardar',text:'¿Continuar sin guardar estos cambios?',showCancelButton:true,confirmButtonText:'Continuar',cancelButtonText:'Volver',confirmButtonColor:'#002f6c'})).isConfirmed;}
  async function showHistory(){if(busy||!await canLeave())return;setDirty(false);setView('history');}
  async function openRecord(id:string){if(busy)return;setBusy(true);try{const res=await inspectDelivery(id);if(res.error||!res.result){await alertError(res.error||'Acta no disponible.');return;}const record=res.result.record;setDraft(draftSchema.parse(record.data));setRecordId(record.id);setRevision(record.revision);setFolio(record.folio);setCancelled(!!record.deleted_at);setDirty(false);setError('');setMessage(record.deleted_at?'ACTA ANULADA · '+record.cancel_reason:'Acta recuperada del historial.');setView('form');}catch{await alertError('No se pudo abrir el acta.');}finally{setBusy(false);}}
  async function startReturn(id:string){if(busy||!await canLeave())return;setBusy(true);try{const res=await inspectDelivery(id);if(res.error||!res.result){await alertError(res.error||'No disponible');return;}const {record,balance}=res.result;if(record.deleted_at){await alertError('La entrega está anulada.');return;}const original=draftSchema.parse(record.data);const items=original.items.flatMap(i=>{const b=balance.find(b=>b.id===i.id);return b&&b.pending>0?[{...i,id:crypto.randomUUID(),sourceItemId:i.id,quantity:String(b.pending),condition:'Usado en buen estado' as const}]:[];});if(!items.length){await alertError('No hay materiales pendientes de devolución.');return;}setDraft({...emptyDraft(),kind:'DEV',worker:original.worker,area:original.area,sourceDeliveryId:id,reference:record.folio,items});setRecordId(crypto.randomUUID());setRevision(0);setFolio('');setCancelled(false);setDirty(true);setView('form');setMessage('Ajusta las cantidades devueltas y retira los materiales que aún no se devolverán.');setError('');}catch{await alertError('No se pudo preparar la devolución.');}finally{setBusy(false);}}
  async function removeRecord(row:DeliverySummary){
    if(busy)return;
    const confirm=await Swal.fire({icon:'warning',title:'Anular acta '+row.folio,input:'textarea',inputLabel:'Motivo de anulación',inputValidator:value=>value.trim().length<5?'Escribe un motivo de al menos 5 caracteres.':undefined,text:'El acta se conservará para supervisión.',showCancelButton:true,confirmButtonText:'Anular acta',cancelButtonText:'Cancelar',confirmButtonColor:'#b91c1c'});
    if(!confirm.isConfirmed)return;setBusy(true);
    try{const res=await deleteDelivery(row.id,row.revision,String(confirm.value));if(res.error){await alertError(res.error);return;}if(recordId===row.id){setRecordId(crypto.randomUUID());setRevision(0);setFolio('');setCancelled(false);setDraft(emptyDraft());setDirty(false);}await Swal.fire({icon:'success',title:'Acta anulada',text:'El motivo quedó registrado.',confirmButtonColor:'#002f6c'});}catch{await alertError('No se pudo eliminar la entrega. Intenta nuevamente.');}finally{setBusy(false);}
  }
  async function eraseRecord(row:DeliverySummary){
    if(busy)return;
    const answer=await Swal.fire({icon:'warning',title:'Eliminar '+row.folio,text:'Se eliminarán definitivamente el acta y sus versiones guardadas. El folio no se reutilizará. Esta acción no se puede deshacer.',showCancelButton:true,confirmButtonText:'Sí, eliminar definitivamente',cancelButtonText:'Conservar acta',confirmButtonColor:'#b91c1c'});
    if(!answer.isConfirmed)return;setBusy(true);
    try{const res=await permanentlyDeleteDelivery(row.id,row.revision);if(res.error){await alertError(res.error);return;}if(recordId===row.id){setDraft(emptyDraft());setRecordId(crypto.randomUUID());setRevision(0);setFolio('');setCancelled(false);setDirty(false);}await Swal.fire({icon:'success',title:'Acta eliminada',text:'El historial se actualizará.'});}catch{await alertError('No se pudo eliminar el acta.');}finally{setBusy(false);}
  }
  async function newDelivery(){if(busy||!await canLeave())return;setDraft(emptyDraft());setRecordId(crypto.randomUUID());setRevision(0);setFolio('');setCancelled(false);setDirty(false);setError('');setMessage('');setView('form');}

  useEffect(()=>{if(!dirty)return;const guard=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
  function change<K extends keyof Draft>(key:K,value:Draft[K]){setDraft(d=>d?{...d,[key]:value}:d);setDirty(true);setMessage('');}
  function changeItem<K extends keyof Item>(id:string,key:K,value:Item[K]){if(draft)change('items',draft.items.map(i=>i.id===id?{...i,[key]:value}:i));}
  function restore(){
    if(dirty&&!window.confirm('¿Reemplazar los cambios actuales con el borrador guardado?'))return;
    try{const saved=localStorage.getItem(storageKey);if(!saved){setMessage('No hay un borrador guardado en este navegador.');return;}setDraft(draftSchema.parse(JSON.parse(saved)));setRecordId(crypto.randomUUID());setRevision(0);setFolio('');setCancelled(false);setView('form');setDirty(true);setError('');setMessage('Borrador recuperado. Revisa los datos antes de imprimir.');}
    catch{setError('No se pudo recuperar el borrador. Puedes seguir llenando el formulario.');}
  }
  async function save(){
    if(busy||!draft||cancelled)return;
    if(!draft.worker&&revision===0){await alertError('Selecciona un trabajador o registra uno nuevo.');return;}
    const checked=savedDeliverySchema.safeParse(draft);
    if(!checked.success){await alertError(checked.error.issues[0].message);return;}
    setBusy(true);void Swal.fire({title:'Guardando entrega',text:'Espera mientras se guarda en la base de datos.',allowOutsideClick:false,allowEscapeKey:false,didOpen:()=>Swal.showLoading()});
    try{const res=await saveDelivery(recordId,revision,checked.data);Swal.close();if(res.error||!res.record){await alertError(res.error||'No se pudo guardar.');return;}setRevision(res.record.revision);setFolio(res.record.folio);setDraft(draftSchema.parse(res.record.data));setDirty(false);setError('');setMessage('Entrega guardada en la base de datos.');await Swal.fire({icon:'success',title:'Acta guardada',text:res.record.folio+' · Disponible en el historial. Las firmas se recogen en la impresión.',confirmButtonColor:'#002f6c'});}catch{Swal.close();await alertError('No se pudo confirmar el guardado. Intenta nuevamente; no se duplicará la entrega.');}finally{setBusy(false);}
  }

  function print(){
    if(!draft)return;
    if(!folio||dirty){setError('Guarda el acta antes de imprimir para incluir su folio y los últimos cambios.');return;}
    if(!draft.worker&&revision===0){setError('Selecciona un trabajador o registra uno nuevo antes de imprimir.');return;}
    if(!draft.date||!draft.area.trim()){setError('Completa la fecha y el área antes de imprimir.');return;}
    if(draft.items.some(i=>!i.description.trim()||!Number.isFinite(Number(i.quantity))||Number(i.quantity)<=0)){setError('Cada ítem debe tener una descripción y una cantidad mayor que cero.');return;}
    if((draft.receipt==='Recibido con observaciones'||draft.items.some(i=>i.condition==='Con observaciones'))&&!draft.observations.trim()){setError('Detalla las observaciones de la entrega.');return;}
    setError('');window.print();
  }
  const field=(key:'date'|'area'|'reference'|'location'|'reason'|'registeredBy',label:string,required=false,type='text')=><label className="delivery-field" key={key}>{label}{required?' *':''}<input type={type} required={required} maxLength={key==='reason'?3000:200} value={draft?.[key]||''} onChange={e=>change(key,type==='date'?e.target.value:e.target.value.toLocaleUpperCase('es'))}/></label>;

  if(!allowed||!draft)return <main className="delivery-login"><form onSubmit={async e=>{e.preventDefault();setChecking(true);setError('');try{if(await checkDeliveryCode(pin)){setDraft(emptyDraft());setRecordId(crypto.randomUUID());setRevision(0);setFolio('');setCancelled(false);setView(supervision?'history':'form');setAllowed(true);setPin('');}else setError('Clave incorrecta.');}catch{setError('No se pudo verificar la clave. Intenta nuevamente.');}finally{setChecking(false);}}}>
    
    <Image unoptimized src="/logo_ende_deoruro.png" alt="ENDE DEORURO" width={130} height={70}/>
    <span className="delivery-tag">SEGURIDAD INDUSTRIAL</span><h1>Entregas y devoluciones</h1><p>Herramientas, EPP y supervisión de actas.</p>
    <label className="delivery-field">Clave de acceso<input autoComplete="off" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value)} required/></label>
    {error&&<p role="alert" className="delivery-error">{error}</p>}<button disabled={checking} className="delivery-primary"><KeyRound size={18}/>{checking?'Verificando…':'Ingresar al acta'}</button><Link href="/">Volver al sistema principal</Link>
  </form></main>;

  return <main className="delivery-page">
    <div className="delivery-editor">
      <header className="delivery-header"><div><Image unoptimized src="/logo_ende_deoruro.png" alt="ENDE DEORURO" width={100} height={60}/><div><span className="delivery-tag">ENTREGAS Y DEVOLUCIONES</span><h1>Herramientas y EPP</h1><p>Folios · Historial · Entregas y devoluciones</p></div></div><button className="delivery-secondary" disabled={busy} onClick={async()=>{if(!await canLeave())return;await logoutDelivery();setAllowed(false);setDraft(null);setMessage('');setError('');setDirty(false);}}><LogOut size={17}/> Salir</button></header>
      <fieldset disabled={busy}><div className="delivery-notice"><b>Documento pendiente de firmas.</b> Selecciona al trabajador del padrón compartido. Quien entrega y el supervisor se identificarán con sus sellos y firmas en el acta impresa. Este formulario no descuenta materiales del almacén.</div>
      <div className="delivery-actions"><button className="delivery-secondary" onClick={newDelivery}><Plus size={17}/> Nueva acta</button><button className="delivery-secondary" onClick={showHistory}><History size={17}/> Historial y supervisión</button>{view==='form'&&!cancelled&&<><button className="delivery-primary" onClick={save}><Save size={17}/> {revision?'Guardar cambios':'Guardar acta'}</button><button className="delivery-secondary" onClick={restore}><FolderOpen size={17}/> Recuperar borrador local anterior</button><button className="delivery-secondary" onClick={print}><Printer size={17}/> Imprimir / PDF</button></>}</div>
      {view==='history'&&<DeliveryHistory onOpen={openRecord} onCancel={removeRecord} onDelete={eraseRecord} onReturn={startReturn}/>}
      <div hidden={view!=='form'}>
      {message&&<p role="status" className="delivery-notice">{message}</p>}{error&&<p role="alert" className="delivery-error">{error}</p>}
      <div className="delivery-notice"><b>{folio||'Folio automático al guardar'}</b>{draft.sourceDeliveryId&&<p>Devolución vinculada a {draft.reference}</p>}</div>
      {cancelled&&<button className="delivery-secondary" onClick={print}><Printer size={17}/> Imprimir acta anulada</button>}
      <fieldset disabled={cancelled}>
      <DeliveryWorkerPicker key={recordId+'-'+view} worker={draft.worker} onBusy={setBusy} onSelect={worker=>{setDraft(d=>d?{...d,worker,area:d.area||worker?.department||''}:d);setDirty(true);setMessage('');}}/>
      <section className="delivery-card"><h2><FileCheck2/> 2. Datos del acta</h2><label className="delivery-field">Tipo de acta<select disabled={revision>0||!!draft.sourceDeliveryId} value={draft.kind} onChange={e=>change('kind',e.target.value as Draft['kind'])}><option value="ENT">Entrega: supervisor → trabajador</option><option value="DEV">Devolución: trabajador → supervisor</option></select></label>{draft.kind==='DEV'&&!draft.sourceDeliveryId&&<p className="delivery-notice">Devolución sin entrega vinculada. Para descontarla del saldo de una entrega, inicia desde su botón Registrar devolución en el historial.</p>}<div className="delivery-grid">{field('date','Fecha',true,'date')}{field('area','Área',true)}{field('registeredBy','Registrado por (nombre declarado, opcional)')}</div><details><summary className="cursor-pointer text-sm font-bold">Otros datos (opcional)</summary><div className="delivery-grid mt-4">{field('reference','N.º de referencia')}{field('location','Lugar')}</div>{field('reason','Motivo de la entrega')}</details></section>
      <section className="delivery-card"><div className="delivery-actions"><button className="delivery-secondary" onClick={async()=>{try{await downloadDeliveryExcel();}catch{await alertError('No se pudo crear la plantilla Excel.');}}}>Descargar plantilla Excel</button><button className="delivery-secondary" onClick={async()=>{if(dirty||!folio){await alertError('Guarda el acta antes de exportarla.');return;}try{await downloadDeliveryExcel(draft,folio);}catch{await alertError('No se pudo exportar.');}}}>Exportar acta a Excel</button>{!draft.sourceDeliveryId&&<ImportMaterials count={draft.items.length} onBusy={setBusy} onImport={(items,append)=>change('items',append?[...draft.items,...items]:items)}/>}</div><div className="delivery-section-title"><h2>3. Detalle de herramientas y EPP</h2><button className="delivery-secondary" disabled={draft.items.length>=100||!!draft.sourceDeliveryId} onClick={()=>change('items',[...draft.items,newItem()])}><Plus size={17}/> Agregar ítem</button></div>
        {draft.items.map((item,n)=><div className="delivery-item" key={item.id}><div className="delivery-section-title"><b>Ítem {n+1}</b><button className="delivery-delete" disabled={draft.items.length===1} aria-label={`Eliminar ítem ${n+1}`} onClick={()=>change('items',draft.items.filter(i=>i.id!==item.id))}><Trash2 size={18}/></button></div><div className="delivery-item-grid">
          <label className="delivery-field">Categoría<select value={item.category} onChange={e=>changeItem(item.id,'category',e.target.value as Item['category'])}><option>Herramientas</option><option>EPP</option></select></label>
          <label className="delivery-field">Descripción *<DescriptionInput disabled={!!draft.sourceDeliveryId} value={item.description} onChange={value=>changeItem(item.id,'description',value)}/></label>
          <label className="delivery-field">Cantidad *<input type="number" min="0.01" step="any" value={item.quantity} onChange={e=>changeItem(item.id,'quantity',e.target.value)}/></label>
          <label className="delivery-field">Unidad<select disabled={!!draft.sourceDeliveryId} value={item.unit} onChange={e=>changeItem(item.id,'unit',e.target.value as Item['unit'])}><option>Pza</option><option>Par</option><option>Metros</option></select></label>
          <label className="delivery-field">Estado<select value={item.condition} onChange={e=>changeItem(item.id,'condition',e.target.value as Item['condition'])}><option>Nuevo</option><option>Usado en buen estado</option><option>Con observaciones</option></select></label>
        </div><label className="delivery-field">Marca, modelo, serie / código de activo y accesorios<input maxLength={500} value={item.identification} onChange={e=>changeItem(item.id,'identification',e.target.value.toLocaleUpperCase('es'))}/></label></div>)}
      </section>
      <section className="delivery-card"><h2>4. Recepción y observaciones</h2><label className="delivery-field">Conformidad de recepción<select value={draft.receipt} onChange={e=>change('receipt',e.target.value as Draft['receipt'])}><option>Recibido conforme</option><option>Recibido con observaciones</option></select></label><label className="delivery-field">Observaciones de entrega y recepción<textarea rows={4} maxLength={5000} value={draft.observations} onChange={e=>change('observations',e.target.value.toLocaleUpperCase('es'))}/></label><p>Los faltantes, daños o incidentes anteriores deben detallarse; no se consideran entregados por llenar este documento.</p></section>
      <div className="delivery-actions"><button className="delivery-secondary" onClick={save}><Save size={17}/> {revision?'Guardar cambios':'Guardar acta'}</button><button className="delivery-primary" onClick={print}><Printer size={17}/> Imprimir / PDF</button></div>
      </fieldset></div></fieldset>
    </div>
    <article className="delivery-print print-area">
      <header><Image unoptimized src="/logo_ende_deoruro.png" alt="ENDE DEORURO" width={100} height={60}/><div><h1>ACTA DE {draft.kind==='DEV'?'DEVOLUCIÓN':'ENTREGA'} DE HERRAMIENTAS Y EPP</h1><b>{folio}</b>{cancelled&&<strong> · ANULADA</strong>}<p>SEGURIDAD INDUSTRIAL Y SALUD OCUPACIONAL</p></div></header>
      <p><b>Fecha:</b> {draft.date.split('-').reverse().join('/')} · <b>Área:</b> {draft.area}</p>{draft.reference&&<p><b>Referencia:</b> {draft.reference}</p>}{draft.location&&<p><b>Lugar:</b> {draft.location}</p>}
      {draft.worker&&<p><b>Trabajador:</b> {draft.worker.fullName} · <b>CI:</b> {draft.worker.ci||'—'}{draft.worker.position&&<> · <b>Cargo:</b> {draft.worker.position}</>}{draft.worker.department&&<> · <b>Área del trabajador:</b> {draft.worker.department}</>}</p>}
      {draft.reason&&<p><b>Motivo:</b> {draft.reason}</p>}
      <table><thead><tr><th colSpan={5}>ENDE · {folio} · {draft.kind==='DEV'?'DEVOLUCIÓN':'ENTREGA'}{cancelled?' · ANULADA':''}</th></tr><tr><th>N.º</th><th>Herramienta / EPP e identificación</th><th>Cantidad</th><th>Unidad</th><th>Estado</th></tr></thead><tbody>{draft.items.map((i,n)=><tr key={i.id}><td>{n+1}</td><td><b>{i.description}</b><br/>{i.category}{i.identification&&<><br/>{i.identification}</>}</td><td>{i.quantity}</td><td>{i.unit}</td><td>{i.condition}</td></tr>)}</tbody></table>
      <p><b>Recepción:</b> {draft.receipt}</p><p className="delivery-print-observations"><b>Observaciones:</b> {draft.observations||'SIN OBSERVACIONES'}</p>
      <p>Se deja constancia de la entrega y recepción de los elementos detallados, en las cantidades y condiciones indicadas. {draft.kind==='DEV'?'El trabajador entrega y el supervisor de área recibe los materiales devueltos.':'El supervisor de área entrega y el trabajador recibe los materiales.'} El responsable de área y Seguridad Industrial expresan su conformidad. Quien recibe deja constancia de la recepción mediante su firma, incluyendo las observaciones consignadas.</p>
      <div className="delivery-signatures">{[[draft.kind==='DEV'?'RECIBÍ CONFORME':'ENTREGUÉ CONFORME','SUPERVISOR DE ÁREA'],['CONFORMIDAD','RESPONSABLE DE ÁREA'],['CONFORMIDAD','SEGURIDAD INDUSTRIAL'],[draft.kind==='DEV'?'ENTREGUÉ CONFORME':'RECIBÍ CONFORME',draft.worker?.fullName||'NOMBRE DEL TRABAJADOR']].map(([title,detail])=><div key={detail}><div className="delivery-sign-line"/><strong>{title}</strong><span>{detail}</span></div>)}</div>
      <p className="delivery-print-note">El llenado de este documento no sustituye las firmas. Cualquier pérdida o incidente posterior se documentará por separado con referencia a esta entrega.</p>
    </article>
  </main>;
}
