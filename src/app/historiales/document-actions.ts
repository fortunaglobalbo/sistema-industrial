'use server';
import { z } from 'zod';
import { requireMedical } from '@/lib/medical/server';
import { documentInput, validateDocument } from '@/lib/medical/document-validation';
import type { DocumentFilter, MedicalDocument } from '@/lib/medical/templates';

const filters=z.object({template:z.string().max(30).optional(),worker:z.uuid().optional(),from:z.iso.date().optional(),to:z.iso.date().optional(),status:z.enum(['draft','final']).optional(),offset:z.number().int().min(0).max(100000).optional()});
export async function listMedicalDocuments(filter:DocumentFilter):Promise<{documents:MedicalDocument[];more:boolean}> {
  const {db,token}=await requireMedical();
  const {data,error}=await db.rpc('medical_documents_list',{session_token:token,filters:filters.parse(filter)});
  if(error) throw new Error('No se pudieron cargar los formatos. Verifica la conexión y que esté aplicada la actualización 005 en Supabase.');
  return data;
}
export async function saveMedicalDocument(input:unknown):Promise<{document?:MedicalDocument;error?:string}> {
  try {
    const {db,token}=await requireMedical();
    const parsed=documentInput.safeParse(input);
    if(!parsed.success) return {error:'Revisa los datos del documento: '+parsed.error.issues[0].message};
    const payload={...parsed.data,data:validateDocument(parsed.data)};
    const {data,error}=await db.rpc('medical_document_save_v2',{session_token:token,payload});
    if(error) return {error:error.code==='40001'?'Este documento cambió en otra ventana. Conserva tus cambios y vuelve a abrir la versión guardada.':'No se confirmó el guardado. Revisa los campos, tu conexión y la actualización 005. Conserva el formulario e intenta nuevamente.'};
    return {document:data};
  }catch(e){return {error:e instanceof Error?e.message:'No se guardó el documento.'};}
}
