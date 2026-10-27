begin;
create table public.delivery_records (
 id uuid primary key,
 data jsonb not null check(jsonb_typeof(data)='object'),
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz
);
alter table public.delivery_records enable row level security;
revoke all on public.delivery_records from anon,authenticated;
create index delivery_records_active_date on public.delivery_records(created_at desc,id) where deleted_at is null;

create function public.delivery_records_access(access_code text,operation text,target uuid default null,payload jsonb default null,expected_revision integer default 0,page_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec public.delivery_records; result jsonb;
begin
 if access_code is distinct from '1010' then raise exception 'Acceso denegado' using errcode='42501'; end if;
 if operation='list' then
  if page_offset is null or page_offset<0 then raise exception 'Invalid offset'; end if;
  select coalesce(jsonb_agg(x),'[]') into result from (
   select id,revision,data->>'date' as date,data->>'area' as area,data->>'reference' as reference,jsonb_array_length(data->'items') as item_count,created_at
   from public.delivery_records where deleted_at is null order by created_at desc,id limit 50 offset page_offset
  ) x; return result;
 end if;
 if target is null then raise exception 'Invalid identifier'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target::text,8));
 select * into rec from public.delivery_records where id=target for update;
 if operation='read' then
  if rec.id is null or rec.deleted_at is not null then raise exception 'CONFLICT'; end if;
  return to_jsonb(rec)-'deleted_at';
 elsif operation='delete' then
  if rec.id is null or rec.revision is distinct from expected_revision then raise exception 'CONFLICT'; end if;
  update public.delivery_records set deleted_at=coalesce(deleted_at,now()),updated_at=now() where id=target;
  return jsonb_build_object('success',true);
 elsif operation='save' then
  if payload is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>500000 then raise exception 'Invalid document'; end if;
  if jsonb_typeof(payload->'items') is distinct from 'array' then raise exception 'Invalid items'; end if;
  if jsonb_array_length(payload->'items') not between 1 and 100 or coalesce(trim(payload->>'area'),'')='' or coalesce(payload->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid document'; end if;
  perform (payload->>'date')::date;
  if exists(select 1 from jsonb_array_elements(payload->'items') i where coalesce(trim(i->>'description'),'')='' or coalesce(i->>'unit','') not in ('Pza','Par','Metros') or coalesce(i->>'quantity','') !~ '^([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$') then raise exception 'Invalid item'; end if;
  if exists(select 1 from jsonb_array_elements(payload->'items') i where (i->>'quantity')::numeric<=0) then raise exception 'Invalid quantity'; end if;
  if rec.id is null then
   if expected_revision is distinct from 0 then raise exception 'CONFLICT'; end if;
   insert into public.delivery_records(id,data) values(target,payload) returning * into rec;
  else
   if rec.deleted_at is not null then raise exception 'CONFLICT'; end if;
   if rec.data=payload and (rec.revision=expected_revision or rec.revision=expected_revision+1) then return to_jsonb(rec)-'deleted_at'; end if;
   if rec.revision is distinct from expected_revision then raise exception 'CONFLICT'; end if;
   update public.delivery_records set data=payload,revision=revision+1,updated_at=now() where id=target returning * into rec;
  end if;
  return to_jsonb(rec)-'deleted_at';
 end if;
 raise exception 'Invalid operation';
end $$;
revoke all on function public.delivery_records_access(text,text,uuid,jsonb,integer,integer) from public;
grant execute on function public.delivery_records_access(text,text,uuid,jsonb,integer,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
