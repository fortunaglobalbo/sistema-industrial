import { searchMedicalWorkers, readMedicalCase } from '@/app/historiales/actions';
import type { MedicalWorker, MedicalCase } from './types';
import { listMedicalDocuments, saveMedicalDocument } from '@/app/historiales/document-actions';
import { validateDocument, type SaveDocumentInput } from './document-validation';
import type { MedicalDocument, DocumentFilter } from './templates';
export type DocumentsApi = { searchPatients:(query:string)=>Promise<MedicalWorker[]>; readPatient:(id:string)=>Promise<MedicalCase>; list:(f:DocumentFilter)=>Promise<{documents:MedicalDocument[];more:boolean}>; save:(input:SaveDocumentInput)=>Promise<{document?:MedicalDocument;error?:string}> };
export const documentsApi:DocumentsApi = {list:listMedicalDocuments,save:saveMedicalDocument,searchPatients:searchMedicalWorkers,readPatient:readMedicalCase};
// Explicit local preview only: all state is in memory and is discarded on reload.
export function previewDocumentsApi():DocumentsApi {
  const people=new Map<string,MedicalWorker>();
  const records=new Map<string,MedicalDocument>();
  const requests=new Map<string,{input:string;document:MedicalDocument}>();
  function person(values:Record<string,string>,selected:string|null){
    const prior=selected?people.get(selected):undefined;
    const full_name=(values.fullName||[values.names,values.paternal,values.maternal].filter(Boolean).join(' ')||prior?.full_name||'').toUpperCase();
    if(!full_name)throw new Error('Escribe el nombre del trabajador.');
    const ci=(values.ci||prior?.ci||'').toUpperCase();
    const match=selected||([...people.values()].find(p=>ci&&p.ci===ci)?.id)||crypto.randomUUID();
    const result={id:match,full_name,ci,position:values.occupation||prior?.position||'',department:values.department||prior?.department||'',names:values.names||prior?.names||'',paternal:values.paternal||prior?.paternal||'',maternal:values.maternal||prior?.maternal||''};
    return result;
  }
  return {
    async searchPatients(query){return structuredClone([...people.values()].filter(p=>(p.full_name+' '+p.ci).includes(query.toUpperCase())).slice(0,50));},
    async readPatient(id){const worker=people.get(id);if(!worker)throw new Error('Persona inexistente.');return {worker:structuredClone(worker),encounters:[]};},
    async list(f){
      const all=[...records.values()].map(d=>({...d,superseded:[...records.values()].some(c=>c.correction_of===d.id&&c.status==='final')})).filter(d=>(!f.template||d.template_id===f.template)&&(!f.status||d.status===f.status)&&(!f.worker||d.worker_id===f.worker||d.data.rows.some(r=>r.workerId===f.worker))&&(!f.from||d.period>=f.from)&&(!f.to||d.period<=f.to)).sort((a,b)=>b.period.localeCompare(a.period)||b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id));
      const offset=f.offset||0;return {documents:structuredClone(all.slice(offset,offset+50)),more:all.length>offset+50};
    },
    async save(input){
      try{
        const previous=requests.get(input.requestId);
        if(previous){if(previous.input!==JSON.stringify(input))throw new Error('Solicitud ya utilizada.');return {document:structuredClone(previous.document)};}
        const old=records.get(input.id);
        if((old?.revision||0)!==input.revision)throw new Error('El documento cambió o ya está finalizado.');
        const data=validateDocument(input);
        if(input.correctionOf){const parent=records.get(input.correctionOf);if(!parent||parent.status!=='final'||parent.template_id!==input.templateId||parent.worker_id!==input.workerId||parent.source_document_id||[...records.values()].some(d=>d.correction_of===parent.id&&d.status==='final'))throw new Error('El original no permite esta corrección.');}
        const pending:MedicalWorker[]=[];
        const isFicha=['historia','ocupacional','periodica'].includes(input.templateId);
        const worker=isFicha?person(data.fields,input.workerId):undefined;
        if(worker)pending.push(worker);
        if(!isFicha&&input.templateId!=='farmacia')data.rows=data.rows.map(r=>{const p=person(r,r.workerId||null);pending.push(p);return {...r,workerId:p.id,fullName:p.full_name};});
        const stamp=new Date().toISOString();
        const doc:MedicalDocument={id:input.id,template_id:input.templateId,worker_id:worker?.id||null,worker_snapshot:worker?{...worker}:{},period:input.period,status:input.finalize?'final':'draft',revision:(old?.revision||0)+1,data,author_name:'Doctora de ejemplo',created_at:old?.created_at||stamp,updated_at:stamp,finalized_at:input.finalize?stamp:null,correction_of:input.correctionOf,correction_reason:input.correctionReason,source_document_id:old?.source_document_id||null,source_managed:old?.source_document_id?false:true};
        pending.forEach(p=>people.set(p.id,p));
        records.set(doc.id,structuredClone(doc));
        if(doc.template_id==='historia'&&doc.status==='final'){
          const origin=doc.correction_of?[...records.values()].find(d=>d.source_document_id===doc.correction_of):undefined;
          const derived=[...records.values()].find(d=>d.source_document_id===doc.id);
          const id=derived?.id||crypto.randomUUID();const fields=doc.data.fields;const row=Object.fromEntries(['date','time','workSchedule','paternal','maternal','names','sex','age','diagnosis','kind','treatment','referral','recommendations'].map(k=>[k,fields[k]||'']));
          if(derived?.source_managed!==false)records.set(id,{...doc,id,revision:(derived?.revision||0)+1,source_managed:true,template_id:'consultas',period:doc.period.slice(0,7)+'-01',worker_id:null,worker_snapshot:{},data:{fields:{},rows:[{...row,workerId:doc.worker_id!,fullName:doc.worker_snapshot.full_name,ci:doc.worker_snapshot.ci,doctorSignature:'',patientSignature:''}]},source_document_id:doc.id,correction_of:origin?.id||null,correction_reason:origin?'Actualizado desde la historia clínica':''});
        }
        requests.set(input.requestId,{input:JSON.stringify(input),document:structuredClone(doc)});
        return {document:structuredClone(doc)};
      }catch(e){return {error:e instanceof Error?e.message:'Error al guardar.'};}
    },
  };
}
