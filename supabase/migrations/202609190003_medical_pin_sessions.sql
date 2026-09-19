-- Acceso directo por código. Ejecutar después de 001 y 002.
-- Conserva historias y auditoría; no necesita correo, contraseña ni Supabase Auth.
begin;
alter table public.medical_staff drop constraint medical_staff_user_id_fkey;
alter table public.medical_encounters drop constraint medical_encounters_author_id_fkey;
alter table public.medical_audit drop constraint medical_audit_actor_id_fkey;
alter table public.medical_encounters add constraint medical_encounters_author_id_fkey
  foreign key(author_id) references public.medical_staff(user_id) on delete restrict;
alter table public.medical_audit add constraint medical_audit_actor_id_fkey
  foreign key(actor_id) references public.medical_staff(user_id) on delete restrict;
revoke all on public.medical_staff from authenticated;

create table public.medical_code_access (
  id boolean primary key default true check(id),
  staff_id uuid not null references public.medical_staff(user_id) on delete restrict,
  code_hash bytea not null,
  active boolean not null default true
);
create table public.medical_code_sessions (
  token_hash bytea primary key,
  staff_id uuid not null references public.medical_staff(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '8 hours'
);
alter table public.medical_code_access enable row level security;
alter table public.medical_code_sessions enable row level security;
revoke all on public.medical_code_access, public.medical_code_sessions from anon,authenticated;

do $$
declare staff uuid;
begin
  if (select count(*) from public.medical_staff where active) = 1 then
    select user_id into staff from public.medical_staff where active;
  else
    -- Identidad propia del acceso por código, sin crear una cuenta de email.
    staff := gen_random_uuid();
    insert into public.medical_staff(user_id,display_name) values(staff,'Doctora');
  end if;
  insert into public.medical_code_access(id,staff_id,code_hash)
    values(true,staff,sha256(convert_to('5501','UTF8')));
end $$;

create function public.medical_pin_login(code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare staff uuid; token text;
begin
  if not public.medical_claim_login_attempt() then
    return jsonb_build_object('error','locked');
  end if;
  if code is null or code !~ '^[0-9]{4}$' then
    return jsonb_build_object('error','invalid');
  end if;
  select a.staff_id into staff from public.medical_code_access a
    join public.medical_staff s on s.user_id=a.staff_id
    where a.active and s.active and a.code_hash=sha256(convert_to(code,'UTF8'));
  if staff is null then return jsonb_build_object('error','invalid'); end if;
  token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  delete from public.medical_code_sessions where expires_at <= now();
  insert into public.medical_code_sessions(token_hash,staff_id)
    values(sha256(convert_to(token,'UTF8')),staff);
  return jsonb_build_object('token',token);
end $$;

create function public.medical_pin_identity(session_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare staff uuid;
begin
  if session_token is null or session_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Sesión inválida' using errcode='42501';
  end if;
  select s.staff_id into staff from public.medical_code_sessions s
    join public.medical_staff m on m.user_id=s.staff_id
    join public.medical_code_access a on a.staff_id=s.staff_id and a.active
    where s.token_hash=sha256(convert_to(session_token,'UTF8')) and s.expires_at>now() and m.active;
  if staff is null then raise exception 'Sesión inválida' using errcode='42501'; end if;
  return staff;
end $$;

create function public.medical_pin_session(session_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare staff uuid; name text;
begin
  staff := public.medical_pin_identity(session_token);
  select display_name into name from public.medical_staff where user_id=staff;
  return jsonb_build_object('id',staff,'name',name);
end $$;

create function public.medical_pin_read_case(session_token text, target uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare staff uuid; result jsonb; previous_subject text;
begin
  staff := public.medical_pin_identity(session_token);
  previous_subject := current_setting('request.jwt.claim.sub',true);
  perform set_config('request.jwt.claim.sub',staff::text,true);
  result := public.medical_read_case(target);
  perform set_config('request.jwt.claim.sub',coalesce(previous_subject,''),true);
  return result;
end $$;

create function public.medical_pin_save_encounter(session_token text, payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare staff uuid; result uuid; previous_subject text;
begin
  staff := public.medical_pin_identity(session_token);
  previous_subject := current_setting('request.jwt.claim.sub',true);
  perform set_config('request.jwt.claim.sub',staff::text,true);
  result := public.medical_save_encounter(payload);
  perform set_config('request.jwt.claim.sub',coalesce(previous_subject,''),true);
  return result;
end $$;

create function public.medical_pin_logout(session_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.medical_code_sessions where token_hash=sha256(convert_to(session_token,'UTF8'));
$$;

-- Las funciones anteriores de Auth y el limitador dejan de ser endpoints públicos.
revoke all on function public.medical_read_case(uuid), public.medical_save_encounter(jsonb),
  public.medical_claim_login_attempt(),public.medical_pin_identity(text) from public,anon,authenticated;
revoke all on function public.medical_pin_login(text),public.medical_pin_session(text),
  public.medical_pin_read_case(text,uuid),public.medical_pin_save_encounter(text,jsonb),
  public.medical_pin_logout(text) from public;
grant execute on function public.medical_pin_login(text),public.medical_pin_session(text),
  public.medical_pin_read_case(text,uuid),public.medical_pin_save_encounter(text,jsonb),
  public.medical_pin_logout(text) to anon,authenticated;
commit;
