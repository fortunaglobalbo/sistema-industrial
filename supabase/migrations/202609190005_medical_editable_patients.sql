-- 005: pacientes médicos independientes, guardado editable y versiones anteriores.
-- Ejecutar después de 004. No modifica el padrón ni las actas compartidas.
begin;
create table public.medical_patients (
 id uuid primary key default gen_random_uuid(),full_name text not null,ci text not null default '',
 position text not null default '',department text not null default '',
 names text not null default '',paternal text not null default '',maternal text not null default ''
);
alter table public.medical_patients enable row level security;
revoke all on public.medical_patients from public,anon,authenticated;
insert into public.medical_patients(id,full_name,ci,position,department)
 select w.id,upper(w.full_name),upper(coalesce(w.ci,'')),upper(coalesce(w.position,'')),upper(coalesce(w.department,'')) from public.workers w
 where exists(select 1 from public.medical_document_workers d where d.worker_id=w.id)
 or exists(select 1 from public.medical_encounters e where e.worker_id=w.id);
alter table public.medical_documents drop constraint medical_documents_worker_id_fkey;
alter table public.medical_documents add foreign key(worker_id) references public.medical_patients(id) on delete restrict;
alter table public.medical_document_workers drop constraint medical_document_workers_worker_id_fkey;
alter table public.medical_document_workers add foreign key(worker_id) references public.medical_patients(id) on delete restrict;
alter table public.medical_documents add column source_managed boolean not null default true;
create table public.medical_document_versions(document_id uuid not null references public.medical_documents(id),revision integer not null,snapshot jsonb not null,archived_at timestamptz not null default now(),primary key(document_id,revision));
alter table public.medical_document_versions enable row level security;
revoke all on public.medical_document_versions from public,anon,authenticated;
create or replace function public.medical_document_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'No se permite eliminar documentos'; end if;
 insert into public.medical_document_versions(document_id,revision,snapshot) values(old.id,old.revision,to_jsonb(old)) on conflict do nothing;
 return new;
end $$;
create function public.medical_upper_values(vals jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb;
begin
 if vals is null or jsonb_typeof(vals)<>'object' then raise exception 'Campos inválidos'; end if;
 if exists(select 1 from jsonb_each(vals) where jsonb_typeof(value)<>'string') then raise exception 'Valor inválido'; end if;
 select coalesce(jsonb_object_agg(key,case when key='workerId' then value else to_jsonb(upper(value#>>'{}')) end),'{}') into result from jsonb_each(vals);
 return result;
end $$;
create function public.medical_patient_resolve(vals jsonb,selected uuid) returns uuid language plpgsql set search_path='' as $$
declare person public.medical_patients; label text; identity_ci text; matches integer; resolved uuid;
begin
 label:=upper(trim(coalesce(nullif(trim(vals->>'fullName'),''),nullif(trim(concat_ws(' ',vals->>'names',vals->>'paternal',vals->>'maternal')),''),'')));
 identity_ci:=upper(trim(coalesce(vals->>'ci','')));
 if selected is not null then
   select * into person from public.medical_patients where id=selected;
   if not found then raise exception 'Persona inexistente. Escribe sus datos o vuelve a buscar.'; end if;
   if label='' then label:=person.full_name; end if;
   if identity_ci='' then identity_ci:=person.ci; end if;
 end if;
 if label='' then raise exception 'Escribe el nombre del trabajador'; end if;
 if length(label)>6000 or length(identity_ci)>6000 then raise exception 'Identificación demasiado larga'; end if;
 perform pg_advisory_xact_lock(hashtextextended(coalesce(nullif(identity_ci,''),label),5));
 resolved:=selected;
 if resolved is null and identity_ci<>'' then
   select count(*),(array_agg(id))[1] into matches,resolved from public.medical_patients where ci=identity_ci;
   if matches>1 then raise exception 'Hay varias personas con ese CI. Selecciona una en el buscador.'; end if;
 end if;
 -- Without CI, only an explicit search selection reuses a person; names can coincide.
 if resolved is null then
   insert into public.medical_patients(full_name,ci,position,department,names,paternal,maternal)
   values(label,identity_ci,coalesce(vals->>'occupation',''),coalesce(vals->>'department',''),coalesce(vals->>'names',''),coalesce(vals->>'paternal',''),coalesce(vals->>'maternal','')) returning id into resolved;
 else
   update public.medical_patients set full_name=label,ci=identity_ci,
    position=coalesce(vals->>'occupation',position),department=coalesce(vals->>'department',department),
    names=coalesce(vals->>'names',names),paternal=coalesce(vals->>'paternal',paternal),maternal=coalesce(vals->>'maternal',maternal) where id=resolved;
 end if;
 return resolved;
end $$;
-- Select choices accept stored legacy spelling as well as uppercase display values.
create or replace function public.medical_document_validate_values(vals jsonb, fields jsonb, finalize boolean, extras boolean) returns void
language plpgsql set search_path='' as $$
declare field jsonb; item record; v text;
begin
 if vals is null or jsonb_typeof(vals)<>'object' then raise exception 'Campos inválidos'; end if;
 for item in select * from jsonb_each(vals) loop
   if jsonb_typeof(item.value)<>'string' or length(item.value#>>'{}')>6000 then raise exception 'Valor inválido'; end if;
   if not exists(select 1 from jsonb_array_elements(fields) x where x->>'key'=item.key) and not(extras and item.key in ('workerId','fullName','ci')) then raise exception 'Campo desconocido: %',item.key; end if;
 end loop;
 for field in select * from jsonb_array_elements(fields) loop
   v:=trim(coalesce(vals->>(field->>'key'),''));
   if finalize and coalesce((field->>'required')::boolean,false) and v='' then raise exception 'Campo requerido: %',field->>'label'; end if;
   if v='' then continue; end if;
   if field->>'type'='number' and (v !~ '^[0-9]+(\.[0-9]+)?$' or length(v)>20) then raise exception 'Número inválido'; end if;
   if field->>'type'='date' then
     if v !~ '^\d{4}-\d{2}-\d{2}$' or (v::date)::text<>v then raise exception 'Fecha inválida'; end if;
   end if;
   if field->>'type'='time' and v !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Hora inválida'; end if;
   if field ? 'options' and not exists(select 1 from jsonb_array_elements_text(field->'options') opt where upper(opt)=upper(v)) then raise exception 'Opción inválida'; end if;
 end loop;
end $$;

create function public.medical_document_save_v2(session_token text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 staff uuid; name text; doc_id uuid; req uuid; target uuid; correction uuid; result jsonb; prev_result record;
 old_doc public.medical_documents; parent public.medical_documents; definition jsonb; docdata jsonb; fs jsonb; rowdata jsonb; rowsdata jsonb:='[]';
 snap jsonb:='{}'; d date; is_final boolean; keys jsonb; linked uuid; n integer; used numeric; balance numeric; days integer;
 source_correction uuid; generated uuid; consult_row jsonb;
begin
 staff:=public.medical_pin_identity(session_token);
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>1000000 then raise exception 'Documento inválido'; end if;
 doc_id:=(payload->>'id')::uuid; req:=(payload->>'requestId')::uuid; target:=(payload->>'workerId')::uuid; correction:=(payload->>'correctionOf')::uuid;
 d:=(payload->>'period')::date; is_final:=(payload->>'finalize')::boolean;
 if doc_id is null or req is null or d is null or is_final is null or (payload->>'revision')::integer<0 or payload->>'revision' is null then raise exception 'Datos incompletos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(req::text,0));
 select * into prev_result from public.medical_document_requests where request_id=req;
 if found then
   if prev_result.author_id<>staff or prev_result.payload_hash<>sha256(convert_to(payload::text,'UTF8')) then raise exception 'Solicitud ya utilizada'; end if;
   return prev_result.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(doc_id::text,1));
 select * into old_doc from public.medical_documents where id=doc_id for update;
 if found then
   -- Saved documents remain editable; revision checks still prevent lost updates.
   if old_doc.revision<>(payload->>'revision')::integer then raise exception 'Conflicto de versión' using errcode='40001'; end if;
   if old_doc.template_id<>payload->>'templateId' or old_doc.correction_of is distinct from correction then raise exception 'No se puede cambiar el tipo o el original'; end if;
 elsif (payload->>'revision')::integer<>0 then raise exception 'Versión inexistente' using errcode='40001'; end if;
 select t.definition into definition from public.medical_form_templates t where t.id=payload->>'templateId';
 if definition is null then raise exception 'Plantilla inválida'; end if;
 docdata:=payload->'data'; fs:=public.medical_upper_values(docdata->'fields');
 if jsonb_typeof(docdata)<>'object' or docdata is null or jsonb_typeof(docdata->'rows')<>'array' or docdata->'rows' is null then raise exception 'Contenido inválido'; end if;
 if jsonb_array_length(docdata->'rows')>100 then raise exception 'Máximo 100 filas por documento'; end if;
 if definition->>'kind'='ficha' then
   if jsonb_array_length(docdata->'rows')<>0 then raise exception 'Ficha inválida'; end if;
   target:=public.medical_patient_resolve(fs,target);
 end if;
 if definition->>'kind'='planilla' and (target is not null or (is_final and jsonb_array_length(docdata->'rows')=0)) then raise exception 'Planilla inválida'; end if;
 if definition->>'period'='month' and extract(day from d)<>1 then raise exception 'Periodo mensual inválido'; end if;
 if definition->>'period'='year' and to_char(d,'MM-DD')<>'01-01' then raise exception 'Periodo anual inválido'; end if;
 select coalesce(jsonb_agg(f),'[]') into keys from jsonb_array_elements(definition->'sections') sec cross join lateral jsonb_array_elements(sec->'fields') f;
 perform public.medical_document_validate_values(fs,keys,false,true);
 if definition->>'period'='date' and coalesce(fs->>'date','')<>'' and (fs->>'date')::date<>d then raise exception 'La fecha no coincide'; end if;
 if target is not null then
   select jsonb_build_object('id',w.id,'full_name',w.full_name,'ci',w.ci,'position',w.position,'department',w.department) into snap from public.medical_patients w where w.id=target;
   if snap is null then raise exception 'Trabajador inexistente'; end if;
 end if;
 if correction is not null and old_doc.id is null then
   select * into parent from public.medical_documents where id=correction for update;
   if not found or parent.status<>'final' or parent.template_id<>payload->>'templateId' or parent.worker_id is distinct from target or parent.source_document_id is not null then raise exception 'Original inválido'; end if;
   if exists(select 1 from public.medical_documents where correction_of=correction and status='final') then raise exception 'El original ya tiene una corrección final'; end if;
   if length(trim(coalesce(payload->>'correctionReason','')))=0 or length(payload->>'correctionReason')>2000 then raise exception 'Describe la corrección'; end if;
 end if;
 for rowdata in select * from jsonb_array_elements(docdata->'rows') loop
   rowdata:=public.medical_upper_values(rowdata);
   perform public.medical_document_validate_values(rowdata,coalesce(definition->'columns','[]'),false,true);
   if payload->>'templateId'<>'farmacia' then
     linked:=nullif(rowdata->>'workerId','')::uuid;
     linked:=public.medical_patient_resolve(rowdata,linked);
     rowdata:=rowdata||jsonb_build_object('workerId',linked::text);
     if nullif(trim(rowdata->>'fullName'),'') is null then rowdata:=rowdata||jsonb_build_object('fullName',(select full_name from public.medical_patients where id=linked)); end if;
     if linked is not null and not exists(select 1 from public.medical_patients where id=linked) then raise exception 'Trabajador de fila inexistente'; end if;
   end if;
   if coalesce(rowdata->>'startDate','')<>'' and coalesce(rowdata->>'endDate','')<>'' and (rowdata->>'endDate')::date<(rowdata->>'startDate')::date then raise exception 'Alta anterior al inicio'; end if;
   if coalesce(rowdata->>'date','')<>'' and (case when definition->>'period'='month' then to_char((rowdata->>'date')::date,'YYYY-MM')<>to_char(d,'YYYY-MM') else extract(year from (rowdata->>'date')::date)<>extract(year from d) end) then raise exception 'Fila fuera del periodo'; end if;
   if payload->>'templateId'='farmacia' then
     days:=extract(day from (d+interval '1 month - 1 day')); used:=0;
     for n in 1..31 loop
       if n>days and coalesce(nullif(rowdata->>('day'||n),''),'0')::numeric<>0 then raise exception 'Consumo fuera del mes'; end if;
       used:=used+coalesce(nullif(rowdata->>('day'||n),''),'0')::numeric;
     end loop;
     balance:=coalesce(nullif(rowdata->>'opening',''),'0')::numeric+coalesce(nullif(rowdata->>'incoming',''),'0')::numeric-used;
     if balance<0 then raise exception 'Saldo negativo'; end if;
     rowdata:=rowdata||jsonb_build_object('used',used::text,'balance',balance::text);
   end if;
   rowsdata:=rowsdata||jsonb_build_array(rowdata);
 end loop;
 docdata:=jsonb_build_object('fields',fs,'rows',rowsdata);
 select display_name into name from public.medical_staff where user_id=staff;
 insert into public.medical_documents(id,template_id,worker_id,worker_snapshot,period,status,revision,data,author_id,author_name,finalized_at,correction_of,correction_reason)
 values(doc_id,payload->>'templateId',target,coalesce(snap,'{}'),d,case when is_final then 'final' else 'draft' end,1,docdata,staff,name,case when is_final then now() end,correction,coalesce(payload->>'correctionReason',''))
 on conflict(id) do update set worker_id=excluded.worker_id,worker_snapshot=excluded.worker_snapshot,period=excluded.period,status=excluded.status,revision=public.medical_documents.revision+1,data=excluded.data,author_id=excluded.author_id,author_name=excluded.author_name,updated_at=now(),finalized_at=excluded.finalized_at,correction_reason=excluded.correction_reason,source_managed=case when public.medical_documents.source_document_id is not null then false else public.medical_documents.source_managed end;
 delete from public.medical_document_workers where document_id=doc_id;
 if target is not null then insert into public.medical_document_workers values(doc_id,target); end if;
 for rowdata in select * from jsonb_array_elements(rowsdata) loop
   if payload->>'templateId'<>'farmacia' and nullif(rowdata->>'workerId','') is not null then insert into public.medical_document_workers values(doc_id,(rowdata->>'workerId')::uuid) on conflict do nothing; end if;
 end loop;
 insert into public.medical_document_audit(actor_id,document_id,event,details) values(staff,doc_id,case when is_final then 'finalize' else 'save_draft' end,jsonb_build_object('revision',coalesce(old_doc.revision,0)+1));
 if is_final and payload->>'templateId'='historia' then
   select id into source_correction from public.medical_documents where source_document_id=correction;
   select id into generated from public.medical_documents where source_document_id=doc_id;
   generated:=coalesce(generated,gen_random_uuid());
   select coalesce(jsonb_object_agg(key,value),'{}') into consult_row from jsonb_each(fs) where key in ('date','time','workSchedule','paternal','maternal','names','sex','age','diagnosis','kind','treatment','referral','recommendations');
   consult_row:=consult_row||jsonb_build_object('workerId',target::text,'fullName',snap->>'full_name','ci',snap->>'ci','doctorSignature','','patientSignature','');
   insert into public.medical_documents(id,template_id,worker_id,period,status,data,author_id,author_name,finalized_at,source_document_id,correction_of,correction_reason)
   values(generated,'consultas',null,date_trunc('month',d)::date,'final',jsonb_build_object('fields','{}'::jsonb,'rows',jsonb_build_array(consult_row)),staff,name,now(),doc_id,source_correction,case when source_correction is null then '' else 'Actualizado desde la corrección de la historia clínica' end)
   on conflict(source_document_id) do update set data=excluded.data,period=excluded.period,updated_at=now(),revision=public.medical_documents.revision+1,author_id=excluded.author_id,author_name=excluded.author_name
   where public.medical_documents.source_managed;
   if exists(select 1 from public.medical_documents where id=generated and source_managed) then
     delete from public.medical_document_workers where document_id=generated;
     insert into public.medical_document_workers values(generated,target);
   end if;
   insert into public.medical_document_audit(actor_id,document_id,event) values(staff,generated,'derived_consultation');
 end if;
 select to_jsonb(x) into result from public.medical_documents x where id=doc_id;
 insert into public.medical_document_requests values(req,staff,sha256(convert_to(payload::text,'UTF8')),result);
 return result;
end $$;


create function public.medical_patients_search(session_token text,query text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare staff uuid; result jsonb;
begin
 staff:=public.medical_pin_identity(session_token);
 if length(query)>100 then raise exception 'Búsqueda demasiado larga'; end if;
 select coalesce(jsonb_agg(to_jsonb(p) order by p.full_name,p.id),'[]') into result from (
  select p.* from public.medical_patients p
  where (position(upper(trim(query)) in p.full_name)>0 or position(upper(trim(query)) in p.ci)>0)
  and (exists(select 1 from public.medical_document_workers dw join public.medical_documents d on d.id=dw.document_id where dw.worker_id=p.id)
   or exists(select 1 from public.medical_encounters e where e.worker_id=p.id))
  order by p.full_name,p.id limit 50
 ) p;
 insert into public.medical_document_audit(actor_id,event,details) values(staff,'search_patients',jsonb_build_object('count',jsonb_array_length(result)));
 return result;
end $$;
create function public.medical_patient_case(session_token text,target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare staff uuid; person jsonb; entries jsonb;
begin
 staff:=public.medical_pin_identity(session_token);
 select to_jsonb(p) into person from public.medical_patients p where id=target;
 if person is null then raise exception 'Persona inexistente'; end if;
 select coalesce(jsonb_agg(to_jsonb(e) order by created_at desc),'[]') into entries from public.medical_encounters e where worker_id=target;
 insert into public.medical_document_audit(actor_id,event,details) values(staff,'read_patient',jsonb_build_object('patient',target));
 return jsonb_build_object('worker',person,'encounters',entries);
end $$;
revoke all on function public.medical_upper_values(jsonb),public.medical_patient_resolve(jsonb,uuid),public.medical_patients_search(text,text),public.medical_patient_case(text,uuid) from public,anon,authenticated;
grant execute on function public.medical_patients_search(text,text),public.medical_patient_case(text,uuid) to anon,authenticated;
revoke all on function public.medical_document_save(text,jsonb),public.medical_document_save_v2(text,jsonb) from public,anon,authenticated;
grant execute on function public.medical_document_save_v2(text,jsonb) to anon,authenticated;
commit;
