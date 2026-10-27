'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileCheck2, KeyRound, Plus, Trash2, Printer, Save, FolderOpen, LogOut } from 'lucide-react';
import { z } from 'zod';
import { checkDeliveryCode } from '@/app/entrega/actions';
import './delivery.css';

const itemSchema = z.object({
  id:z.string(), category:z.enum(['Herramientas','EPP']), description:z.string().max(1000),
  quantity:z.string().max(20), unit:z.enum(['Pza','Par','Metros']),
  condition:z.enum(['Nuevo','Usado en buen estado','Con observaciones']), identification:z.string().max(500),
});
const draftSchema=z.object({
  reference:z.string().max(80), date:z.string().max(10), location:z.string().max(200), area:z.string().max(200),
  reason:z.string().max(3000), observations:z.string().max(5000),
  receipt:z.enum(['Recibido conforme','Recibido con observaciones']), items:z.array(itemSchema).min(1).max(100),
});
type Draft=z.infer<typeof draftSchema>;
type Item=z.infer<typeof itemSchema>;
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
  useEffect(()=>{if(!dirty)return;const guard=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
  function change<K extends keyof Draft>(key:K,value:Draft[K]){setDraft(d=>d?{...d,[key]:value}:d);setDirty(true);setMessage('');}
  function changeItem<K extends keyof Item>(id:string,key:K,value:Item[K]){if(draft)change('items',draft.items.map(i=>i.id===id?{...i,[key]:value}:i));}
  function restore(){
    if(dirty&&!window.confirm('¿Reemplazar los cambios actuales con el borrador guardado?'))return;
    try{const saved=localStorage.getItem(storageKey);if(!saved){setMessage('No hay un borrador guardado en este navegador.');return;}setDraft(draftSchema.parse(JSON.parse(saved)));setDirty(false);setError('');setMessage('Borrador recuperado. Revisa los datos antes de imprimir.');}
    catch{setError('No se pudo recuperar el borrador. Puedes seguir llenando el formulario.');}
  }
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(draft));setDirty(false);setError('');setMessage('Borrador guardado solo en este navegador. No confirma una entrega.');}catch{setError('El navegador no permitió guardar. Puedes imprimir o guardar como PDF.');}}
  function print(){
    if(!draft)return;
    if(!draft.date||!draft.area.trim()){setError('Completa la fecha y el área antes de imprimir.');return;}
    if(draft.items.some(i=>!i.description.trim()||!Number.isFinite(Number(i.quantity))||Number(i.quantity)<=0)){setError('Cada ítem debe tener una descripción y una cantidad mayor que cero.');return;}
    if((draft.receipt==='Recibido con observaciones'||draft.items.some(i=>i.condition==='Con observaciones'))&&!draft.observations.trim()){setError('Detalla las observaciones de la entrega.');return;}
    setError('');window.print();
  }
  const field=(key:Exclude<keyof Draft,'items'|'receipt'>,label:string,required=false,type='text')=><label className="delivery-field" key={key}>{label}{required?' *':''}<input type={type} required={required} maxLength={key==='reason'?3000:200} value={draft?.[key]||''} onChange={e=>change(key,type==='date'?e.target.value:e.target.value.toLocaleUpperCase('es'))}/></label>;

  if(!allowed||!draft)return <main className="delivery-login"><form onSubmit={async e=>{e.preventDefault();setChecking(true);setError('');try{if(await checkDeliveryCode(pin)){setDraft(emptyDraft());setAllowed(true);setPin('');}else setError('Clave incorrecta.');}catch{setError('No se pudo verificar la clave. Intenta nuevamente.');}finally{setChecking(false);}}}>
    
    <Image unoptimized src="/logo_ende_deoruro.png" alt="ENDE DEORURO" width={130} height={70}/>
    <span className="delivery-tag">SEGURIDAD INDUSTRIAL</span><h1>Entrega de herramientas y EPP</h1><p>Acta con visto bueno, conformidad del supervisor y recepción.</p>
    <label className="delivery-field">Clave de acceso<input autoComplete="off" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value)} required/></label>
    {error&&<p role="alert" className="delivery-error">{error}</p>}<button disabled={checking} className="delivery-primary"><KeyRound size={18}/>{checking?'Verificando…':'Ingresar al acta'}</button><Link href="/">Volver al sistema principal</Link>
  </form></main>;

  return <main className="delivery-page">
    <div className="delivery-editor">
      <header className="delivery-header"><div><Image unoptimized src="/logo_ende_deoruro.png" alt="ENDE DEORURO" width={100} height={60}/><div><span className="delivery-tag">ACTA DE ENTREGA</span><h1>Herramientas y EPP</h1><p>Llenado libre · Visto bueno · Conformidad · Recepción</p></div></div><button className="delivery-secondary" onClick={()=>{if(dirty&&!window.confirm('Hay cambios sin guardar. ¿Salir?'))return;setAllowed(false);setDraft(null);setMessage('');setError('');setDirty(false);}}><LogOut size={17}/> Salir</button></header>
      <div className="delivery-notice"><b>Documento pendiente de firmas.</b> No necesitas escribir nombres, CI ni cargos: se identificarán con sus sellos y firmas en el acta impresa. Este formulario no descuenta materiales del almacén.</div>
      <div className="delivery-actions"><button className="delivery-secondary" onClick={save}><Save size={17}/> Guardar borrador local</button><button className="delivery-secondary" onClick={restore}><FolderOpen size={17}/> Recuperar borrador</button><button className="delivery-primary" onClick={print}><Printer size={17}/> Imprimir / PDF</button></div>
      {message&&<p role="status" className="delivery-notice">{message}</p>}{error&&<p role="alert" className="delivery-error">{error}</p>}
      <section className="delivery-card"><h2><FileCheck2/> 1. Datos de la entrega</h2><div className="delivery-grid">{field('date','Fecha',true,'date')}{field('area','Área',true)}</div><details><summary className="cursor-pointer text-sm font-bold">Otros datos (opcional)</summary><div className="delivery-grid mt-4">{field('reference','N.º de referencia')}{field('location','Lugar')}</div>{field('reason','Motivo de la entrega')}</details></section>
      <section className="delivery-card"><div className="delivery-section-title"><h2>2. Detalle de herramientas y EPP</h2><button className="delivery-secondary" disabled={draft.items.length>=100} onClick={()=>change('items',[...draft.items,newItem()])}><Plus size={17}/> Agregar ítem</button></div>
        {draft.items.map((item,n)=><div className="delivery-item" key={item.id}><div className="delivery-section-title"><b>Ítem {n+1}</b><button className="delivery-delete" disabled={draft.items.length===1} aria-label={`Eliminar ítem ${n+1}`} onClick={()=>change('items',draft.items.filter(i=>i.id!==item.id))}><Trash2 size={18}/></button></div><div className="delivery-item-grid">
          <label className="delivery-field">Categoría<select value={item.category} onChange={e=>changeItem(item.id,'category',e.target.value as Item['category'])}><option>Herramientas</option><option>EPP</option></select></label>
          <label className="delivery-field">Descripción *<input maxLength={1000} value={item.description} onChange={e=>changeItem(item.id,'description',e.target.value.toLocaleUpperCase('es'))}/></label>
          <label className="delivery-field">Cantidad *<input type="number" min="0.01" step="any" value={item.quantity} onChange={e=>changeItem(item.id,'quantity',e.target.value)}/></label>
          <label className="delivery-field">Unidad<select value={item.unit} onChange={e=>changeItem(item.id,'unit',e.target.value as Item['unit'])}><option>Pza</option><option>Par</option><option>Metros</option></select></label>
          <label className="delivery-field">Estado<select value={item.condition} onChange={e=>changeItem(item.id,'condition',e.target.value as Item['condition'])}><option>Nuevo</option><option>Usado en buen estado</option><option>Con observaciones</option></select></label>
        </div><label className="delivery-field">Marca, modelo, serie / código de activo y accesorios<input maxLength={500} value={item.identification} onChange={e=>changeItem(item.id,'identification',e.target.value.toLocaleUpperCase('es'))}/></label></div>)}
      </section>
      <section className="delivery-card"><h2>3. Recepción y observaciones</h2><label className="delivery-field">Conformidad de recepción<select value={draft.receipt} onChange={e=>change('receipt',e.target.value as Draft['receipt'])}><option>Recibido conforme</option><option>Recibido con observaciones</option></select></label><label className="delivery-field">Observaciones de entrega y recepción<textarea rows={4} maxLength={5000} value={draft.observations} onChange={e=>change('observations',e.target.value.toLocaleUpperCase('es'))}/></label><p>Los faltantes, daños o incidentes anteriores deben detallarse; no se consideran entregados por llenar este documento.</p></section>
      <div className="delivery-actions"><button className="delivery-secondary" onClick={save}><Save size={17}/> Guardar borrador local</button><button className="delivery-primary" onClick={print}><Printer size={17}/> Imprimir / PDF</button></div>
    </div>
    <article className="delivery-print print-area">
      <header><Image unoptimized src="/logo_ende_deoruro.png" alt="ENDE DEORURO" width={100} height={60}/><div><h1>ACTA DE ENTREGA DE HERRAMIENTAS Y EPP</h1><p>SEGURIDAD INDUSTRIAL Y SALUD OCUPACIONAL</p></div></header>
      <p><b>Fecha:</b> {draft.date.split('-').reverse().join('/')} · <b>Área:</b> {draft.area}</p>{draft.reference&&<p><b>Referencia:</b> {draft.reference}</p>}{draft.location&&<p><b>Lugar:</b> {draft.location}</p>}
      {draft.reason&&<p><b>Motivo:</b> {draft.reason}</p>}
      <table><thead><tr><th>N.º</th><th>Herramienta / EPP e identificación</th><th>Cantidad</th><th>Unidad</th><th>Estado</th></tr></thead><tbody>{draft.items.map((i,n)=><tr key={i.id}><td>{n+1}</td><td><b>{i.description}</b><br/>{i.category}{i.identification&&<><br/>{i.identification}</>}</td><td>{i.quantity}</td><td>{i.unit}</td><td>{i.condition}</td></tr>)}</tbody></table>
      <p><b>Recepción:</b> {draft.receipt}</p><p className="delivery-print-observations"><b>Observaciones:</b> {draft.observations||'SIN OBSERVACIONES'}</p>
      <p>Se deja constancia de la entrega y recepción de los elementos detallados, en las cantidades y condiciones indicadas. El visto bueno de Seguridad Industrial autoriza esta entrega; la conformidad del supervisor corresponde a la asignación en su área. Quien recibe deja constancia de la recepción mediante su firma, incluyendo las observaciones consignadas.</p>
      <div className="delivery-signatures">{[['VISTO BUENO','Seguridad Industrial'],['CONFORMIDAD','Supervisor de área'],[draft.receipt==='Recibido con observaciones'?'RECIBÍ CON OBSERVACIONES':'RECIBÍ CONFORME','Recepción']].map(([title,detail])=><div key={title}><div className="delivery-sign-line"/><strong>{title}</strong><span>{detail}</span><span>Firma, sello y fecha</span></div>)}</div>
      <p className="delivery-print-note">El llenado de este documento no sustituye las firmas. Cualquier pérdida o incidente posterior se documentará por separado con referencia a esta entrega.</p>
    </article>
  </main>;
}
