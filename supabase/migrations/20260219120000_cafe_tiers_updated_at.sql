-- cafe_tiers: agregar updated_at + trigger (fix "record new has no field updated_at")
begin;

alter table public.cafe_tiers
  add column if not exists updated_at timestamptz;

alter table public.cafe_tiers
  alter column updated_at set default now();

update public.cafe_tiers
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cafe_tiers_updated_at on public.cafe_tiers;
create trigger trg_cafe_tiers_updated_at
  before update on public.cafe_tiers
  for each row
  execute function public.set_updated_at();

commit;

select pg_notify('pgrst', 'reload schema');
