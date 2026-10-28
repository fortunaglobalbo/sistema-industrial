begin;
alter table public.delivery_records add column folio text unique, add column cancel_reason text;
create table public.delivery_folio_counters(year integer,kind text,number integer not null,primary key(year,kind));
create table public.delivery_audit(record_id uuid references public.delivery_records(id),revision integer,changed_at timestamptz default now(),data jsonb not null,cancel_reason text,primary key(record_id,revision));
alter table public.delivery_folio_counters enable row level security;
alter table public.delivery_audit enable row level security;
revoke all on public.delivery_folio_counters,public.delivery_audit from anon,authenticated;

create function public.delivery_assign_folio() returns trigger language plpgsql security definer set search_path='' as $$
declare y integer; k text; n integer;
begin
 if new.folio is null then
  y:=extract(year from new.created_at at time zone 'America/La_Paz');
  k:=coalesce(new.data->>'kind','ENT');
  if k not in ('ENT','DEV') then raise exception 'Invalid kind'; end if;
  insert into public.delivery_folio_counters values(y,k,1) on conflict(year,kind) do update set number=public.delivery_folio_counters.number+1 returning number into n;
  new.folio:=k||'-'||y||'-'||lpad(n::text,greatest(6,length(n::text)),'0');
 end if;
 return new;
end $$;
create trigger delivery_folio before insert or update on public.delivery_records for each row execute function public.delivery_assign_folio();
do $$ declare r record; begin for r in select id from public.delivery_records order by created_at,id loop update public.delivery_records set folio=null where id=r.id; end loop; end $$;
alter table public.delivery_records alter column folio set not null;
insert into public.delivery_audit(record_id,revision,changed_at,data,cancel_reason) select id,revision,updated_at,data,cancel_reason from public.delivery_records;
create function public.delivery_track_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.delivery_audit(record_id,revision,data,cancel_reason) values(new.id,new.revision,new.data,new.cancel_reason) on conflict do nothing;
 return new;
end $$;
create trigger delivery_audit after insert or update on public.delivery_records for each row execute function public.delivery_track_change();

alter function public.delivery_records_access(text,text,uuid,jsonb,integer,integer) rename to delivery_records_internal;
revoke all on function public.delivery_records_internal(text,text,uuid,jsonb,integer,integer) from public,anon,authenticated;

create function public.delivery_records_access_v2(access_code text,operation text,target uuid default null,payload jsonb default null,expected_revision integer default 0,page_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec public.delivery_records; source public.delivery_records; result jsonb; k text; item jsonb; supplied numeric; used numeric;
begin
 if access_code is distinct from '1010' then raise exception 'Acceso denegado' using errcode='42501'; end if;
 if page_offset is null or page_offset<0 then raise exception 'Invalid offset'; end if;
 if operation in ('list','supervise') then
  select coalesce(jsonb_agg(x),'[]') into result from (
   select id,revision,folio,coalesce(data->>'kind','ENT') as kind,data->>'date' as date,data->>'area' as area,data->>'reference' as reference,data->'worker'->>'fullName' as worker_name,data->>'registeredBy' as registered_by,jsonb_array_length(data->'items') as item_count,created_at,updated_at,deleted_at,cancel_reason
   from public.delivery_records
   where (operation='supervise' or deleted_at is null)
    and (coalesce(payload->>'query','')='' or position(lower(payload->>'query') in lower(concat_ws(' ',folio,data->>'area',data->'worker'->>'fullName',data->'worker'->>'ci',data->>'registeredBy')))>0)
    and (coalesce(payload->>'kind','')='' or coalesce(data->>'kind','ENT')=payload->>'kind')
    and (coalesce(payload->>'from','')='' or data->>'date'>=payload->>'from')
    and (coalesce(payload->>'to','')='' or data->>'date'<=payload->>'to')
    and (coalesce(payload->>'status','')='' or (payload->>'status'='active' and deleted_at is null) or (payload->>'status'='cancelled' and deleted_at is not null))
   order by created_at desc,id limit 50 offset page_offset
  ) x; return result;
 end if;
 if operation='descriptions' then
  select coalesce(jsonb_agg(description),'[]') into result from (
   select distinct upper(trim(i->>'description')) as description from public.delivery_records r cross join lateral jsonb_array_elements(r.data->'items') i
   where r.deleted_at is null and position(lower(coalesce(payload->>'query','')) in lower(i->>'description'))>0 order by description limit 40
  ) x; return result;
 end if;
 if target is null then raise exception 'Invalid identifier'; end if;
 -- Serialize changes across linked deliveries, preventing concurrent over-returns.
 perform pg_advisory_xact_lock(280009);
 select * into rec from public.delivery_records where id=target for update;
 if operation='inspect' then
  if rec.id is null then raise exception 'CONFLICT'; end if;
  select jsonb_build_object('record',to_jsonb(rec),'audit',coalesce((select jsonb_agg(a order by revision desc) from public.delivery_audit a where record_id=target),'[]'),'balance',coalesce((
   select jsonb_agg(jsonb_build_object('id',i->>'id','description',i->>'description','unit',i->>'unit','delivered',(i->>'quantity')::numeric,'returned',coalesce(t.qty,0),'pending',(i->>'quantity')::numeric-coalesce(t.qty,0)))
   from jsonb_array_elements(rec.data->'items') i left join lateral (
    select sum((j->>'quantity')::numeric) qty from public.delivery_records d cross join lateral jsonb_array_elements(d.data->'items') j
    where d.deleted_at is null and d.data->>'sourceDeliveryId'=target::text and j->>'sourceItemId'=i->>'id'
   ) t on true
  ),'[]')) into result;
  return result;
 elsif operation='cancel' then
  if rec.id is null or rec.revision is distinct from expected_revision or rec.deleted_at is not null then raise exception 'CONFLICT'; end if;
  if length(trim(coalesce(payload->>'reason','')))<5 or length(payload->>'reason')>1000 then raise exception 'REGLA: Escribe el motivo de anulación.'; end if;
  if exists(select 1 from public.delivery_records where deleted_at is null and data->>'sourceDeliveryId'=target::text) then raise exception 'REGLA: Anula primero las devoluciones vinculadas.'; end if;
  update public.delivery_records set deleted_at=now(),updated_at=now(),revision=revision+1,cancel_reason=trim(payload->>'reason') where id=target;
  return jsonb_build_object('success',true);
 elsif operation='delete' then
  raise exception 'REGLA: Utiliza Anular y registra el motivo.';
 elsif operation='save' then
  k:=coalesce(payload->>'kind','ENT');
  if k not in ('ENT','DEV') then raise exception 'Invalid kind'; end if;
  if rec.id is not null and (k<>coalesce(rec.data->>'kind','ENT') or payload->>'sourceDeliveryId' is distinct from rec.data->>'sourceDeliveryId') then raise exception 'REGLA: El tipo y la entrega de origen no pueden cambiar después de guardar.'; end if;
  if k='ENT' and payload->>'sourceDeliveryId' is not null then raise exception 'Invalid source'; end if;
  if exists(select 1 from public.delivery_records where deleted_at is null and data->>'sourceDeliveryId'=target::text) and payload is distinct from rec.data then raise exception 'REGLA: Esta entrega tiene devoluciones. Anúlalas antes de corregir la entrega original.'; end if;
  if payload->>'sourceDeliveryId' is not null then
   select * into source from public.delivery_records where id=(payload->>'sourceDeliveryId')::uuid;
   if source.id is null or source.deleted_at is not null or coalesce(source.data->>'kind','ENT')<>'ENT' or source.id=target then raise exception 'REGLA: La entrega de origen no está disponible.'; end if;
   if payload->'worker'->>'id' is distinct from source.data->'worker'->>'id' then raise exception 'REGLA: La devolución debe corresponder al trabajador de la entrega.'; end if;
   if exists(select 1 from jsonb_array_elements(payload->'items') j group by j->>'sourceItemId' having count(*)>1) then raise exception 'REGLA: No repitas un material de la entrega.'; end if;
   for item in select * from jsonb_array_elements(payload->'items') loop
    select (i->>'quantity')::numeric into supplied from jsonb_array_elements(source.data->'items') i where i->>'id'=item->>'sourceItemId' and i->>'unit'=item->>'unit' and i->>'description'=item->>'description';
    if supplied is null then raise exception 'REGLA: Conserva la descripción y unidad del material original.'; end if;
    select coalesce(sum((j->>'quantity')::numeric),0) into used from public.delivery_records d cross join lateral jsonb_array_elements(d.data->'items') j where d.id<>target and d.deleted_at is null and d.data->>'sourceDeliveryId'=source.id::text and j->>'sourceItemId'=item->>'sourceItemId';
    if (item->>'quantity')::numeric+used>supplied then raise exception 'REGLA: La cantidad devuelta supera el saldo pendiente.'; end if;
   end loop;
  end if;
 end if;
 return public.delivery_records_internal(access_code,operation,target,payload,expected_revision,page_offset);
end $$;
revoke all on function public.delivery_records_access_v2(text,text,uuid,jsonb,integer,integer) from public;
grant execute on function public.delivery_records_access_v2(text,text,uuid,jsonb,integer,integer) to anon,authenticated;
-- Keep old clients subject to the same cancellation and linkage rules.
create function public.delivery_records_access(access_code text,operation text,target uuid default null,payload jsonb default null,expected_revision integer default 0,page_offset integer default 0) returns jsonb language sql security definer set search_path='' as $$ select public.delivery_records_access_v2(access_code,operation,target,payload,expected_revision,page_offset) $$;
revoke all on function public.delivery_records_access(text,text,uuid,jsonb,integer,integer) from public;
grant execute on function public.delivery_records_access(text,text,uuid,jsonb,integer,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
