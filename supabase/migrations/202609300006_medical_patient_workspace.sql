-- 006: expediente con búsqueda inmediata, retiro del listado y peso/talla.
-- Ejecutar una sola vez después de 005. Los registros médicos se conservan.
begin;
alter table public.medical_patients add column removed_at timestamptz;
create function public.medical_patient_remove(session_token text,target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare staff uuid;
begin
 staff:=public.medical_pin_identity(session_token);
 update public.medical_patients set removed_at=now() where id=target and removed_at is null;
 if found then
  insert into public.medical_document_audit(actor_id,event,details) values(staff,'remove_patient_from_list',jsonb_build_object('patient',target));
 elsif not exists(select 1 from public.medical_patients where id=target) then raise exception 'Persona inexistente';
 end if;
end $$;
revoke all on function public.medical_patient_remove(text,uuid) from public,anon,authenticated;
grant execute on function public.medical_patient_remove(text,uuid) to anon,authenticated;
-- These additional fields are optional and do not change existing records.
update public.medical_form_templates set definition=jsonb_set(definition,'{sections,6,fields}',
 (select jsonb_agg(f order by ord) from (
  select f,ord::numeric as ord from jsonb_array_elements(definition#>'{sections,6,fields}') with ordinality as a(f,ord)
  union all select '{"key":"weight","label":"Peso (kg)","type":"number","required":false}'::jsonb,4.1
  union all select '{"key":"height","label":"Talla (m)","type":"number","required":false}'::jsonb,4.2
 ) fields)) where id='historia';
create or replace function public.medical_patient_resolve(vals jsonb,selected uuid) returns uuid language plpgsql set search_path='' as $$
declare person public.medical_patients; label text; identity_ci text; matches integer; resolved uuid;
begin
 label:=upper(trim(coalesce(nullif(trim(vals->>'fullName'),''),nullif(trim(concat_ws(' ',vals->>'names',vals->>'paternal',vals->>'maternal')),''),'')));
 identity_ci:=upper(trim(coalesce(vals->>'ci','')));
 if selected is not null then
   select * into person from public.medical_patients where id=selected and removed_at is null for update;
   if not found then raise exception 'Persona inexistente. Escribe sus datos o vuelve a buscar.'; end if;
   if label='' then label:=person.full_name; end if;
   if identity_ci='' then identity_ci:=person.ci; end if;
 end if;
 if label='' then raise exception 'Escribe el nombre del trabajador'; end if;
 if length(label)>6000 or length(identity_ci)>6000 then raise exception 'Identificación demasiado larga'; end if;
 perform pg_advisory_xact_lock(hashtextextended(coalesce(nullif(identity_ci,''),label),5));
 resolved:=selected;
 if resolved is null and identity_ci<>'' then
   select count(*),(array_agg(id))[1] into matches,resolved from public.medical_patients where ci=identity_ci and removed_at is null;
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
create or replace function public.medical_patients_search(session_token text,query text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare staff uuid; result jsonb;
begin
 staff:=public.medical_pin_identity(session_token);
 if length(query)>100 then raise exception 'Búsqueda demasiado larga'; end if;
 select coalesce(jsonb_agg(to_jsonb(p) order by p.full_name,p.id),'[]') into result from (
  select p.* from public.medical_patients p
  where p.removed_at is null and (position(upper(trim(query)) in p.full_name)>0 or position(upper(trim(query)) in p.ci)>0)
  and (exists(select 1 from public.medical_document_workers dw join public.medical_documents d on d.id=dw.document_id where dw.worker_id=p.id)
   or exists(select 1 from public.medical_encounters e where e.worker_id=p.id))
  order by p.full_name,p.id limit 50
 ) p;
 insert into public.medical_document_audit(actor_id,event,details) values(staff,'search_patients',jsonb_build_object('count',jsonb_array_length(result)));
 return result;
end $$;
create or replace function public.medical_patient_case(session_token text,target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare staff uuid; person jsonb; entries jsonb;
begin
 staff:=public.medical_pin_identity(session_token);
 select to_jsonb(p) into person from public.medical_patients p where id=target and removed_at is null;
 if person is null then raise exception 'Persona inexistente'; end if;
 select coalesce(jsonb_agg(to_jsonb(e) order by created_at desc),'[]') into entries from public.medical_encounters e where worker_id=target;
 insert into public.medical_document_audit(actor_id,event,details) values(staff,'read_patient',jsonb_build_object('patient',target));
 return jsonb_build_object('worker',person,'encounters',entries);
end $$;
commit;
