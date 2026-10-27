import { z } from 'zod';
export const deliveryWorkerSchema=z.object({id:z.uuid(),fullName:z.string().trim().min(1).max(200),ci:z.string().max(80),position:z.string().max(200),department:z.string().max(200),supervisorName:z.string().max(200)});
export type DeliveryWorker=z.infer<typeof deliveryWorkerSchema>;
const itemSchema = z.object({
  id:z.string(), category:z.enum(['Herramientas','EPP']), description:z.string().max(1000),
  quantity:z.string().max(20), unit:z.enum(['Pza','Par','Metros']),
  condition:z.enum(['Nuevo','Usado en buen estado','Con observaciones']), identification:z.string().max(500),
});
export const draftSchema=z.object({
  worker:deliveryWorkerSchema.nullable().optional(),
  reference:z.string().max(80), date:z.string().max(10), location:z.string().max(200), area:z.string().max(200),
  reason:z.string().max(3000), observations:z.string().max(5000),
  receipt:z.enum(['Recibido conforme','Recibido con observaciones']), items:z.array(itemSchema).min(1).max(100),
});
export type Draft=z.infer<typeof draftSchema>;
export type Item=z.infer<typeof itemSchema>;
export const savedDeliverySchema=draftSchema.refine(d=>/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&!Number.isNaN(Date.parse(d.date))&&d.area.trim().length>0,{message:'Completa la fecha y el área.'}).refine(d=>d.items.every(i=>i.description.trim()&&Number.isFinite(Number(i.quantity))&&Number(i.quantity)>0),{message:'Revisa descripción y cantidad de cada ítem.'}).refine(d=>!(d.receipt==='Recibido con observaciones'||d.items.some(i=>i.condition==='Con observaciones'))||!!d.observations.trim(),{message:'Detalla las observaciones de la entrega.'});
export type DeliveryRecord={id:string;revision:number;data:Draft;created_at:string;updated_at:string};
export type DeliverySummary={id:string;revision:number;date:string;area:string;reference:string;item_count:number;created_at:string};
