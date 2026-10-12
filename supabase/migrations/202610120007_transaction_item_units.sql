-- Unidad elegida por ítem. Las actas anteriores conservan su cantidad sin
-- asignarles una unidad que no fue registrada originalmente.
begin;
alter table public.transaction_items
  add column if not exists unit text
  check (unit in ('pza', 'par', 'metros'));
notify pgrst, 'reload schema';
commit;
