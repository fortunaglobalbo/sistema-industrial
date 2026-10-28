'use server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { savedDeliverySchema, type DeliveryRecord, type DeliverySummary, type DeliveryWorker } from '@/lib/delivery';
import { createWorker } from '@/app/actions/transaction';

const cookieName='ende_delivery_access';

export async function checkDeliveryCode(code: string): Promise<boolean> {
  if (typeof code !== 'string' || code !== '1010') return false;
  (await cookies()).delete({name:cookieName,path:'/entrega'});
  (await cookies()).set(cookieName,code,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:28800});
  return true;
}

export async function logoutDelivery(){(await cookies()).delete({name:cookieName,path:'/entrega'});(await cookies()).delete({name:cookieName,path:'/'});}

async function call(operation:string,target:string|null=null,payload:unknown=null,revision=0,offset=0){
  const code=(await cookies()).get(cookieName)?.value;
  if(code!=='1010')throw new Error('La sesión venció. Sal e ingresa nuevamente con tu clave.');
  const {data,error}=await supabase.rpc('delivery_records_access_v2',{access_code:code,operation,target,payload,expected_revision:revision,page_offset:offset});
  if(error){
    if(error.code==='PGRST202')throw new Error('Falta ejecutar la actualización 009 de entregas y devoluciones en Supabase.');
    if(error.message.includes('CONFLICT'))throw new Error('Esta entrega cambió o fue eliminada. Abre el historial para recuperar la versión actual.');
    if(error.message.startsWith('REGLA:'))throw new Error(error.message.slice(6));
    throw new Error('No se pudo completar la operación. Revisa tu conexión e intenta nuevamente.');
  }
  return data;
}
export async function saveDelivery(id:string,revision:number,input:unknown):Promise<{record?:DeliveryRecord;error?:string}>{
  try{await requireDeliveryAccess();const data=savedDeliverySchema.parse(input);
    if(!data.worker&&revision===0)return {error:'Selecciona un trabajador o registra uno nuevo.'};
    if(data.worker){const {data:worker,error}=await supabase.from('workers').select('id,full_name,ci,position,department,supervisor_name').eq('id',data.worker.id).single();if(error||!worker)return {error:'No se encontró al trabajador. Búscalo nuevamente antes de guardar.'};}
    return {record:await call('save',z.uuid().parse(id),data,z.number().int().nonnegative().parse(revision))};}
  catch(e){return {error:e instanceof z.ZodError?e.issues[0].message:e instanceof Error?e.message:'No se pudo guardar.'};}
}
export async function listDeliveries(offset=0):Promise<{rows?:DeliverySummary[];error?:string}>{try{return {rows:await call('list',null,null,0,z.number().int().nonnegative().parse(offset))};}catch(e){return {error:e instanceof Error?e.message:'No se pudo cargar el historial.'};}}
export async function readDelivery(id:string):Promise<{record?:DeliveryRecord;error?:string}>{try{return {record:await call('read',z.uuid().parse(id))};}catch(e){return {error:e instanceof Error?e.message:'No se pudo abrir.'};}}
export async function deleteDelivery(id:string,revision:number,reason:string):Promise<{success?:boolean;error?:string}>{try{await call('cancel',z.uuid().parse(id),{reason:z.string().trim().min(5,'Escribe un motivo de al menos 5 caracteres.').max(1000).parse(reason)},z.number().int().positive().parse(revision));return {success:true};}catch(e){return {error:e instanceof Error?e.message:'No se pudo eliminar.'};}}

async function requireDeliveryAccess(){if((await cookies()).get(cookieName)?.value!=='1010')throw new Error('La sesión venció. Sal e ingresa nuevamente con tu clave.');}
function workerSnapshot(w:{id:string;full_name:string;ci:string|null;position:string|null;department:string|null;supervisor_name:string|null}):DeliveryWorker{return {id:w.id,fullName:w.full_name,ci:w.ci||'',position:w.position||'',department:w.department||'',supervisorName:w.supervisor_name||''};}
const escapedLike=(value:string)=>value.replace(/[\\%_]/g,'\\$&');
export async function searchDeliveryWorkers(query:string):Promise<{workers?:DeliveryWorker[];error?:string}>{
  try{await requireDeliveryAccess();const q=z.string().trim().max(100).parse(query);if(!q)return {workers:[]};
    const pattern='%'+escapedLike(q)+'%';
    const [names,identities]=await Promise.all(['full_name','ci'].map(column=>supabase.from('workers').select('id,full_name,ci,position,department,supervisor_name').ilike(column,pattern).order('full_name').limit(15)));
    if(names.error||identities.error)throw new Error('No se pudo buscar en el padrón. Intenta nuevamente.');
    return {workers:[...new Map([...(names.data||[]),...(identities.data||[])].map(w=>[w.id,workerSnapshot(w)])).values()].sort((a,b)=>a.fullName.localeCompare(b.fullName)).slice(0,15)};
  }catch(e){return {error:e instanceof Error?e.message:'No se pudo buscar.'};}
}
export async function createDeliveryWorker(input:unknown):Promise<{worker?:DeliveryWorker;error?:string}>{
  try{await requireDeliveryAccess();const text=z.string().trim().max(200).transform(v=>v.toLocaleUpperCase('es'));
    const parsed=z.object({fullName:text.refine(Boolean,'Escribe el nombre.'),ci:text.refine(Boolean,'Escribe el CI.'),position:text,department:text}).parse(input);
    const {data:existing,error}=await supabase.from('workers').select('id').ilike('ci',escapedLike(parsed.ci)).limit(1);
    if(error)return {error:'No se pudo verificar el CI. Intenta nuevamente.'};
    if(existing?.length)return {error:'Ya existe un trabajador con ese CI. Selecciónalo en el buscador.'};
    const result=await createWorker({...parsed,supervisorName:''});
    if(!result.success||!result.worker)return {error:result.error||'No se pudo crear al trabajador.'};
    return {worker:result.worker};
  }catch(e){return {error:e instanceof z.ZodError?e.issues[0].message:e instanceof Error?e.message:'No se pudo crear al trabajador.'};}
}

export async function deliveryDescriptions(query:string):Promise<{rows?:string[];error?:string}>{try{return {rows:await call('descriptions',null,{query:z.string().max(200).parse(query)})};}catch(e){return {error:e instanceof Error?e.message:'No se pudo cargar el catálogo.'};}}
export async function inspectDelivery(id:string){try{const result=await call('inspect',z.uuid().parse(id));return {result:result as {record:DeliveryRecord;audit:import('@/lib/delivery').DeliveryAudit[];balance:import('@/lib/delivery').DeliveryBalance[]}};}catch(e){return {error:e instanceof Error?e.message:'No se pudo consultar.'};}}
export async function superviseDeliveries(filters:{query:string;kind:string;from:string;to:string;status:string},offset=0):Promise<{rows?:DeliverySummary[];error?:string}>{try{return {rows:await call('supervise',null,z.object({query:z.string().max(200),kind:z.enum(['','ENT','DEV']),from:z.string().max(10),to:z.string().max(10),status:z.enum(['','active','cancelled'])}).parse(filters),0,z.number().int().nonnegative().parse(offset))};}catch(e){return {error:e instanceof Error?e.message:'No se pudo consultar.'};}}
