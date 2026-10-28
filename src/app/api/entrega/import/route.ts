import {cookies} from 'next/headers';
import {readImportWorkbook,recognizeDeliveryWorkbook} from '@/lib/deliveryImport';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 if((await cookies()).get('ende_delivery_access')?.value!=='1010')return Response.json({error:'Ingresa nuevamente con la clave del módulo.'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Solicitud no permitida.'},{status:403});
 if(Number(request.headers.get('content-length')||0)>4*1024*1024)return Response.json({error:'El archivo debe pesar menos de 3 MB.'},{status:413});
 try{
  const form=await request.formData();const file=form.get('file');
  if(!(file instanceof File)||! /\.(xlsx|xls|csv)$/i.test(file.name))throw new Error('Selecciona un archivo Excel .xlsx, .xls o CSV.');
  if(file.size>3*1024*1024)throw new Error('El archivo debe pesar menos de 3 MB.');
  const rows=readImportWorkbook(await file.arrayBuffer());
  return Response.json(await recognizeDeliveryWorkbook(rows));
 }catch(e){return Response.json({error:e instanceof Error?e.message:'No se pudo reconocer el archivo.'},{status:422});}
}
