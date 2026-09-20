'use client';
import { useEffect, useState } from 'react';
import type { DocumentsApi } from '@/lib/medical/document-api';
import { getTemplate, type MedicalDocument } from '@/lib/medical/templates';

export default function WorkerDocuments({workerId,api,onOpen}:{workerId:string;api:DocumentsApi;onOpen:(doc:MedicalDocument)=>void}){
  const [documents,setDocuments]=useState<MedicalDocument[]>([]);const [busy,setBusy]=useState(true);const [error,setError]=useState('');const [more,setMore]=useState(false);
  useEffect(()=>{let active=true;api.list({worker:workerId}).then(r=>{if(active){setDocuments(r.documents);setMore(r.more);}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No se pudieron cargar los formatos.');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[api,workerId]);
  return <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden"><header className="p-4 border-b border-slate-100 font-bold text-[#002f6c]">Historial de formatos del trabajador</header>{error&&<p role="alert" className="text-red-700 p-4">{error}</p>}{busy&&<p role="status" className="p-4 text-sm text-slate-500">Cargando documentos…</p>}{!busy&&!error&&!documents.length&&<p className="p-5 text-sm text-slate-500">Todavía no hay documentos en las nueve plantillas. Usa Nueva atención o Formatos e historial para registrar uno.</p>}<div className="divide-y divide-slate-100">{documents.map(d=><button key={d.id} onClick={()=>onOpen(d)} className="block text-left w-full p-4 hover:bg-blue-50"><p className="font-bold text-sm">{getTemplate(d.template_id)?.title}</p><p className="text-xs text-slate-500 mt-1">{d.period} · {d.status==='draft'?'Borrador anterior':'Guardado · Editable'} · {d.author_name}{d.superseded?' · Versión anterior corregida':''}</p></button>)}</div>{more&&<p className="p-4 text-xs text-slate-500">Se muestran los 50 documentos más recientes. Abre Formatos e historial para consultar los anteriores.</p>}</section>;
}
