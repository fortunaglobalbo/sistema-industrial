'use server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { savedDeliverySchema, type Draft, type DeliveryRecord, type DeliverySummary } from '@/lib/delivery';

const cookieName='ende_delivery_access';

export async function checkDeliveryCode(code: string): Promise<boolean> {
  if (typeof code !== 'string' || code !== '1010') return false;
  (await cookies()).set(cookieName,code,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/entrega',maxAge:28800});
  return true;
}

export async function logoutDelivery(){(await cookies()).delete({name:cookieName,path:'/entrega'});}

async function call(operation:string,target:string|null=null,payload:Draft|null=null,revision=0,offset=0){
  const code=(await cookies()).get(cookieName)?.value;
  if(code!=='1010')throw new Error('La sesión venció. Sal e ingresa nuevamente con tu clave.');
  const {data,error}=await supabase.rpc('delivery_records_access',{access_code:code,operation,target,payload,expected_revision:revision,page_offset:offset});
  if(error){
    if(error.code==='PGRST202')throw new Error('Falta activar el historial de entregas en Supabase.');
    if(error.message.includes('CONFLICT'))throw new Error('Esta entrega cambió o fue eliminada. Abre el historial para recuperar la versión actual.');
    throw new Error('No se pudo completar la operación. Revisa tu conexión e intenta nuevamente.');
  }
  return data;
}
export async function saveDelivery(id:string,revision:number,input:unknown):Promise<{record?:DeliveryRecord;error?:string}>{
  try{const data=savedDeliverySchema.parse(input);return {record:await call('save',z.uuid().parse(id),data,z.number().int().nonnegative().parse(revision))};}
  catch(e){return {error:e instanceof z.ZodError?e.issues[0].message:e instanceof Error?e.message:'No se pudo guardar.'};}
}
export async function listDeliveries(offset=0):Promise<{rows?:DeliverySummary[];error?:string}>{try{return {rows:await call('list',null,null,0,z.number().int().nonnegative().parse(offset))};}catch(e){return {error:e instanceof Error?e.message:'No se pudo cargar el historial.'};}}
export async function readDelivery(id:string):Promise<{record?:DeliveryRecord;error?:string}>{try{return {record:await call('read',z.uuid().parse(id))};}catch(e){return {error:e instanceof Error?e.message:'No se pudo abrir.'};}}
export async function deleteDelivery(id:string,revision:number):Promise<{success?:boolean;error?:string}>{try{await call('delete',z.uuid().parse(id),null,z.number().int().positive().parse(revision));return {success:true};}catch(e){return {error:e instanceof Error?e.message:'No se pudo eliminar.'};}}
