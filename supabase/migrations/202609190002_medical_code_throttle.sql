-- Limitador persistente compartido por todas las instancias del servidor.
-- No modifica cuentas ni permisos de los expedientes existentes.
begin;
create table public.medical_login_window (
  id boolean primary key default true check (id),
  started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
insert into public.medical_login_window(id) values(true);
alter table public.medical_login_window enable row level security;
revoke all on public.medical_login_window from anon, authenticated;

create function public.medical_claim_login_attempt() returns boolean
language plpgsql security definer set search_path = '' as $$
declare allowed boolean;
begin
  -- El contador global no depende de IPs/cookies manipulables por el cliente.
  update public.medical_login_window
  set attempts = case when started_at <= now() - interval '15 minutes' then 1 else attempts + 1 end,
      started_at = case when started_at <= now() - interval '15 minutes' then now() else started_at end
  where id and (started_at <= now() - interval '15 minutes' or attempts < 5)
  returning true into allowed;
  return coalesce(allowed,false);
end $$;
revoke all on function public.medical_claim_login_attempt() from public;
grant execute on function public.medical_claim_login_attempt() to anon, authenticated;
commit;
