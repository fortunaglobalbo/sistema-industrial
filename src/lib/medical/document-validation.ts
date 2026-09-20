import { z } from 'zod';
import { getTemplate, daysInMonth, pharmacyRow, type FormDataValues } from './templates';

export const documentInput = z.object({
  id:z.uuid(), requestId:z.uuid(), revision:z.number().int().nonnegative(),
  templateId:z.string(), workerId:z.uuid().nullable(), period:z.iso.date(),
  finalize:z.boolean(), correctionOf:z.uuid().nullable(), correctionReason:z.string().trim().max(2000),
  data:z.object({fields:z.record(z.string(),z.string().max(6000)),rows:z.array(z.record(z.string(),z.string().max(6000))).max(100)}),
});
export type SaveDocumentInput = z.infer<typeof documentInput>;
export function validateDocument(input:SaveDocumentInput):FormDataValues {
  const t=getTemplate(input.templateId);
  if(!t) throw new Error('Plantilla desconocida.');
  if(input.correctionOf&&!input.correctionReason.trim()) throw new Error('Describe el motivo de la corrección.');

  if(t.kind==='ficha'&&input.data.rows.length) throw new Error('Una ficha individual no admite filas de planilla.');
  if(input.finalize&&t.kind==='planilla'&&!input.data.rows.length) throw new Error('Añade al menos una fila.');
  const validate=(values:Record<string,string>,fields:NonNullable<typeof t.columns>,row=false)=>{
    const allowed=new Set(fields.map(f=>f.key));
    ['workerId','fullName','ci'].forEach(k=>allowed.add(k));
    for(const key of Object.keys(values)) if(!allowed.has(key)) throw new Error('El formulario contiene un campo desconocido: '+key);
    for(const f of fields){
      const v=(values[f.key]||'').trim();

      if(!v) continue;
      if(f.type==='number'&&(!Number.isFinite(Number(v))||Number(v)<0)) throw new Error('Revisa: '+f.label);
      if(f.type==='date'&&!z.iso.date().safeParse(v).success) throw new Error('Fecha inválida: '+f.label);
      if(f.type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new Error('Hora inválida: '+f.label);
      if(f.options&&!f.options.some(o=>o.toUpperCase()===v.toUpperCase())) throw new Error('Selecciona una opción válida: '+f.label);
    }
    if(values.startDate&&values.endDate&&values.endDate<values.startDate) throw new Error('La fecha de alta no puede ser anterior al inicio.');

    if(t.id==='farmacia'&&row){
      for(let d=daysInMonth(input.period)+1;d<=31;d++) if(Number(values['day'+d]||0)!==0) throw new Error('Hay consumo en un día que no pertenece al mes.');
      if(Number(pharmacyRow(values,input.period).balance)<0) throw new Error('El consumo supera el saldo inicial y los ingresos.');
    }
  };
  const hasName=(r:Record<string,string>)=>!!(r.fullName?.trim()||[r.names,r.paternal,r.maternal].filter(Boolean).join(' ').trim());
  if(t.kind==='ficha'&&!input.workerId&&!hasName(input.data.fields))throw new Error('Escribe el nombre del trabajador.');
  input.data.rows.forEach((r,i)=>{if(t.id!=='farmacia'&&!r.workerId&&!hasName(r))throw new Error('Fila '+(i+1)+': escribe el nombre del trabajador.');});
  validate(input.data.fields,t.sections.flatMap(s=>s.fields));
  input.data.rows.forEach(r=>validate(r,t.columns||[],true));
  if(t.period==='date'&&input.data.fields.date&&input.period!==input.data.fields.date) throw new Error('La fecha del registro debe coincidir con la fecha de la ficha.');
  for(const r of input.data.rows) if(r.date&&(t.period==='month'?r.date.slice(0,7)!==input.period.slice(0,7):r.date.slice(0,4)!==input.period.slice(0,4))) throw new Error('La fecha de una fila está fuera del periodo de la planilla.');
  const upper=(values:Record<string,string>)=>Object.fromEntries(Object.entries(values).map(([k,v])=>[k,k==='workerId'?v:v.toUpperCase()]));
  return {fields:upper(input.data.fields),rows:input.data.rows.map(r=>upper(t.id==='farmacia'?pharmacyRow(r,input.period):r))};
}
