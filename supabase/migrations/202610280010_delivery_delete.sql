begin;
create function public.delivery_delete_permanently(access_code text,target uuid,expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare rec public.delivery_records;
begin
 if access_code is distinct from '1010' then raise exception 'Acceso denegado' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(280009);
 select * into rec from public.delivery_records where id=target for update;
 if rec.id is null or rec.revision is distinct from expected_revision then raise exception 'CONFLICT'; end if;
 if exists(select 1 from public.delivery_records where data->>'sourceDeliveryId'=target::text) then
  raise exception 'REGLA: Elimina primero las devoluciones vinculadas a esta entrega.';
 end if;
 delete from public.delivery_audit where record_id=target;
 delete from public.delivery_records where id=target;
 -- Counters are never reduced: deleted folios cannot be reused.
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.delivery_delete_permanently(text,uuid,integer) from public;
grant execute on function public.delivery_delete_permanently(text,uuid,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
