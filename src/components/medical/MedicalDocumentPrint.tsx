'use client';
import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getTemplate, daysInMonth, months, type MedicalDocument, type Field } from '@/lib/medical/templates';

export const medicalPrintCss = `
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#101828;background:white}
.sheet{padding:10mm;max-width:100%;font-size:10pt}.sheet.landscape{font-size:7pt}
.letterhead{display:flex;align-items:center;gap:18px;border:1px solid #002f6c;border-bottom:4px solid #e5ad16;padding:12px;margin-bottom:12px}
.letterhead img{width:105px;height:auto}.letterhead h1{font-size:16pt;margin:0 0 5px;color:#002f6c}.letterhead small{display:block}
.meta{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0;font-size:9pt}.section{margin:12px 0}.section h2{font-size:10pt;background:#eaf0f7;border:1px solid #a5b5c9;padding:7px;margin:0;color:#002f6c}
.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-left:1px solid #b6c2cf}.field{padding:7px;border-right:1px solid #b6c2cf;border-bottom:1px solid #b6c2cf;min-height:38px;overflow-wrap:anywhere;break-inside:avoid}.field.wide{grid-column:1/-1}.field b{display:block;font-size:8pt;margin-bottom:4px}.value{white-space:pre-wrap;min-height:16px}
table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:inherit}th,td{border:1px solid #677b94;padding:4px 2px;overflow-wrap:anywhere;white-space:pre-wrap;vertical-align:top}th{background:#eaf0f7;color:#002f6c}thead{display:table-header-group}tr{break-inside:avoid}.serial{width:24px}.day{width:1.65%}.signature{min-height:24px}.signatures{display:flex;gap:35px;margin-top:45px;break-inside:avoid}.signatures div{flex:1;border-top:1px solid #222;padding-top:8px;text-align:center}.note{white-space:pre-wrap;margin-top:12px;font-size:8pt}.draft{border:2px solid #b45309;padding:8px;color:#92400e;font-weight:bold}.footer{margin-top:15px;border-top:1px solid #b6c2cf;padding-top:6px;font-size:7pt;color:#475569}
@page{size:A4 portrait;margin:9mm}@page medical-landscape{size:A3 landscape;margin:9mm}.landscape{page:medical-landscape}
@media print{.sheet{padding:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}h2{break-after:avoid}}
`;
function display(value:string|undefined,field:Field){
  if(field.key.toLowerCase().includes('signature')||field.key==='signature') return value?`${value.toUpperCase()}\n________________`: '________________';
  if(!value) return '—';
  if(field.type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  return value.toUpperCase();
}
export function MedicalPaper({doc,logo='/logo_ende_deoruro.png'}:{doc:MedicalDocument;logo?:string}){
  const t=getTemplate(doc.template_id)!;
  let columns=t.columns||[];
  if(t.id==='farmacia') columns=columns.filter(f=>!f.key.startsWith('day')||Number(f.key.slice(3))<=daysInMonth(doc.period));
  if(t.id==='bajas') columns=[{key:'fullName',label:'Nombre completo del trabajador'},...columns];
  if(t.id==='consultas') columns=columns.flatMap(f=>f.key==='kind'?[{key:'isConsulta',label:'Consulta'},{key:'isReconsulta',label:'Reconsulta'}]:[f]);
  const period=t.period==='year'?doc.period.slice(0,4):t.period==='month'?`${months[Number(doc.period.slice(5,7))-1]} ${doc.period.slice(0,4)}`:doc.period.split('-').reverse().join('/');
  return <article className={`sheet ${t.kind==='planilla'?'landscape':''}`}>
    <header className="letterhead">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="ENDE DEORURO"/><div><h1>{t.title.toUpperCase()}</h1><small>Seguridad Industrial y Salud Ocupacional</small>{t.code&&<small>{t.code}</small>}</div>
    </header>
    {doc.status==='draft'&&<div className="draft">BORRADOR · Documento pendiente de finalizar</div>}
    <div className="meta"><span><b>{t.period==='date'?'Fecha':'Periodo'}:</b> {period}</span>{doc.worker_snapshot.full_name&&<span><b>Trabajador:</b> {doc.worker_snapshot.full_name} · CI {doc.worker_snapshot.ci}</span>}</div>
    {doc.correction_of&&<p className="note"><b>Corrección de {doc.correction_of.slice(0,8)}:</b> {doc.correction_reason}</p>}
    {t.sections.filter(s=>!(t.id==='historia'&&s.title==='Datos para el registro de consultas')).map(s=><section className="section" key={s.title}><h2>{s.title}</h2><div className="fields">{s.fields.map(f=><div key={f.key} className={`field ${f.type==='textarea'?'wide':''}`}><b>{f.label}</b><div className="value">{display(doc.data.fields[f.key],f)}</div></div>)}</div></section>)}
    {t.kind==='planilla'&&<table><thead><tr><th className="serial" rowSpan={t.id==='farmacia'?2:1}>N°</th>{columns.map(f=><th key={f.key} className={f.key.startsWith('day')?'day':''}>{f.label}</th>)}</tr>{t.id==='farmacia'&&<tr>{columns.map(f=><th key={f.key}>{f.key.startsWith('day')?['D','L','M','M','J','V','S'][new Date(doc.period.slice(0,8)+f.key.slice(3).padStart(2,'0')+'T12:00:00Z').getUTCDay()]:''}</th>)}</tr>}</thead><tbody>{doc.data.rows.map((r,i)=><tr key={i}><td>{i+1}</td>{columns.map(f=><td key={f.key}>{f.key==='isConsulta'?(r.kind?.toUpperCase()==='CONSULTA'?'X':''):f.key==='isReconsulta'?(r.kind?.toUpperCase()==='RECONSULTA'?'X':''):display(r[f.key],f)}</td>)}</tr>)}</tbody></table>}
    {t.note&&<p className="note">{t.note}</p>}
    {t.signatures&&<div className="signatures">{t.signatures.map(s=><div key={s}>{s}</div>)}</div>}
    <footer className="footer">Registro {doc.id.slice(0,8)} · Versión {doc.revision} · {doc.author_name} · {doc.status==='final'?'Guardado':'Borrador anterior'}{doc.finalized_at?' · '+new Date(doc.finalized_at).toLocaleString('es-BO',{timeZone:'America/La_Paz'}):''}</footer>
  </article>;
}
export default function MedicalDocumentPrint({doc,onClose}:{doc:MedicalDocument;onClose:()=>void}){
  const [src,setSrc]=useState('');
  const t=getTemplate(doc.template_id)!;
  const [paper,setPaper]=useState(t.columns&&t.columns.length>24?'A3':'letter');
  const orientation=t.kind==='planilla'?'landscape':'portrait';
  const pageWidth=paper==='letter'?(orientation==='landscape'?279.4:215.9):paper==='A3'?(orientation==='landscape'?420:297):(orientation==='landscape'?297:210);
  const printCss=medicalPrintCss.replace('size:A4 portrait','size:'+paper+' '+orientation).replace('size:A3 landscape','size:'+paper+' landscape');
  const markup=()=>renderToStaticMarkup(<MedicalPaper doc={doc} logo={new URL('/logo_ende_deoruro.png',window.location.origin).href}/>);
  return <div className="fixed inset-0 z-50 bg-slate-100 overflow-auto" role="dialog" aria-modal="true" aria-label="Vista previa de impresión">
    <div className="sticky top-0 z-10 p-4 bg-white border-b flex flex-wrap items-center justify-between gap-3"><div><b>Vista previa · {t.title}</b><p className="text-xs text-slate-500">{t.kind==='ficha'?'Vertical':'Horizontal'} · En el diálogo de impresión puedes elegir Guardar como PDF.</p></div><div className="flex flex-wrap gap-3 items-center"><label className="text-xs font-bold">Papel <select className="border rounded-lg p-2" value={paper} onChange={e=>setPaper(e.target.value)}><option value="letter">Carta</option><option value="A4">A4</option><option value="A3">A3</option></select></label><button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl">Volver</button><button type="button" disabled={!!src} className="medical-primary" onClick={()=>{setSrc('<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>'+t.title+'</title><style>'+printCss+'</style></head><body>'+markup()+'</body></html>');}}>Imprimir / Guardar PDF</button></div></div>
    <div className="p-4 overflow-auto"><style>{medicalPrintCss.replaceAll('body{','.medical-paper{').replaceAll('@page{size:A4 portrait;margin:9mm}','')}</style><div className="medical-paper bg-white border border-slate-200 shadow mx-auto" style={{width:pageWidth+'mm',minWidth:pageWidth+'mm'}}><MedicalPaper doc={doc}/></div></div>
    {src&&<iframe title="Documento para imprimir" srcDoc={src} style={{position:'fixed',width:1,height:1,left:-10000}} onLoad={async e=>{const frame=e.currentTarget;await Promise.all(Array.from(frame.contentDocument?.images||[]).map(img=>img.complete?Promise.resolve():new Promise<void>(resolve=>{img.onload=()=>resolve();img.onerror=()=>resolve();})));await frame.contentDocument?.fonts.ready;frame.contentWindow?.addEventListener('afterprint',()=>setSrc(''),{once:true});frame.contentWindow?.focus();frame.contentWindow?.print();}}/>}
  </div>;
}
