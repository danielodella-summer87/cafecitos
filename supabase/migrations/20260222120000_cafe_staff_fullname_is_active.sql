-- full_name e is_active para cafe_staff (owner panel: listar/editar/activar-desactivar)
alter table public.cafe_staff
  add column if not exists full_name text;

alter table public.cafe_staff
  add column if not exists is_active boolean not null default true;

-- backfill full_name desde name donde sea null
update public.cafe_staff
set full_name = name
where full_name is null and name is not null;
