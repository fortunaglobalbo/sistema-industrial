-- Ejecutar como propietario en Supabase. No habilita cuentas automáticamente.
begin;
create table public.medical_staff (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (length(trim(display_name)) > 0),
  active boolean not null default true
);
alter table public.medical_staff enable row level security;
revoke all on public.medical_staff from anon, authenticated;
grant select on public.medical_staff to authenticated;
create policy medical_staff_self on public.medical_staff for select to authenticated
  using (user_id = auth.uid());

create table public.medical_encounters (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  worker_id uuid not null references public.workers(id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete restrict,
  author_name text not null,
  worker_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  data jsonb not null check (jsonb_typeof(data) = 'object')
);
create index medical_encounters_worker on public.medical_encounters(worker_id, created_at desc);
create table public.medical_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  worker_id uuid not null references public.workers(id) on delete restrict,
  event text not null check (event in ('read', 'create')),
  encounter_id uuid references public.medical_encounters(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.medical_encounters enable row level security;
alter table public.medical_audit enable row level security;
-- Los clientes no consultan tablas clínicas directamente: las funciones verifican
-- autorización y registran cada apertura o creación de forma atómica.
revoke all on public.medical_encounters, public.medical_audit from anon, authenticated;

create function public.medical_read_case(target uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare person jsonb; entries jsonb;
begin
  if not exists(select 1 from public.medical_staff where user_id = auth.uid() and active) then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  select jsonb_build_object('id',id,'full_name',full_name,'ci',ci,'position',position,'department',department)
  into person from public.workers where id = target;
  if person is null then raise exception 'Trabajador inexistente'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'worker_id',worker_id,'worker_snapshot',worker_snapshot,'author_name',author_name,'created_at',created_at,'data',data)
    order by created_at desc), '[]'::jsonb) into entries from public.medical_encounters where worker_id = target;
  insert into public.medical_audit(actor_id,worker_id,event) values(auth.uid(),target,'read');
  return jsonb_build_object('worker',person,'encounters',entries);
end $$;

create function public.medical_save_encounter(payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare doctor text; record_id uuid; worker uuid; request uuid; existing public.medical_encounters; key text; snapshot jsonb;
begin
  select display_name into doctor from public.medical_staff where user_id = auth.uid() and active;
  if doctor is null then raise exception 'Acceso denegado' using errcode = '42501'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Datos inválidos'; end if;
  worker := (payload->>'workerId')::uuid;
  request := (payload->>'requestId')::uuid;
  if worker is null or request is null or payload->>'kind' is null or payload->>'kind' not in ('consulta','reconsulta') then raise exception 'Datos incompletos'; end if;
  foreach key in array array['reason','illness','personalHistory','occupationalHistory','familyHistory','examination','diagnosis','treatment','referral','recommendations','bloodPressure','heartRate','respiratoryRate','temperature','occurredAt'] loop
    if jsonb_typeof(payload->key) is distinct from 'string' or length(payload->>key) > 6000 then raise exception 'Campo inválido: %',key; end if;
  end loop;
  if length(trim(payload->>'reason')) = 0 or length(trim(payload->>'diagnosis')) = 0 then raise exception 'Motivo y diagnóstico obligatorios'; end if;
  if (payload->>'occurredAt')::timestamptz > now() + interval '1 minute' then raise exception 'Fecha futura'; end if;
  if payload->>'bloodPressure' <> '' and payload->>'bloodPressure' !~ '^\d{2,3}/\d{2,3}$' then raise exception 'Presión inválida'; end if;
  if payload->>'heartRate' <> '' and not ((payload->>'heartRate')::numeric between 1 and 350) then raise exception 'Pulso inválido'; end if;
  if payload->>'respiratoryRate' <> '' and not ((payload->>'respiratoryRate')::numeric between 1 and 150) then raise exception 'Frecuencia inválida'; end if;
  if payload->>'temperature' <> '' and not ((payload->>'temperature')::numeric between 20 and 50) then raise exception 'Temperatura inválida'; end if;
  if payload ? 'correctionOf' and not exists(select 1 from public.medical_encounters where id=(payload->>'correctionOf')::uuid and worker_id=worker) then raise exception 'Corrección inválida'; end if;
  -- Serializa reintentos con el mismo identificador, evitando duplicados.
  perform pg_advisory_xact_lock(hashtextextended(request::text, 0));
  select * into existing from public.medical_encounters where request_id=request;
  if found then
    if existing.author_id = auth.uid() and existing.data = payload then return existing.id; end if;
    raise exception 'Identificador ya utilizado';
  end if;
  select jsonb_build_object('id',id,'full_name',full_name,'ci',ci,'position',position,'department',department)
    into snapshot from public.workers where id=worker;
  if snapshot is null then raise exception 'Trabajador inexistente'; end if;
  insert into public.medical_encounters(request_id,worker_id,author_id,author_name,worker_snapshot,data)
    values(request,worker,auth.uid(),doctor,snapshot,payload) returning id into record_id;
  insert into public.medical_audit(actor_id,worker_id,event,encounter_id) values(auth.uid(),worker,'create',record_id);
  return record_id;
end $$;
revoke all on function public.medical_read_case(uuid), public.medical_save_encounter(jsonb) from public, anon;
grant execute on function public.medical_read_case(uuid), public.medical_save_encounter(jsonb) to authenticated;
commit;
