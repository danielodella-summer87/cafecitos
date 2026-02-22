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

-- merged from 20260219120000_cafes_ficha_and_staff.sql
-- Columnas extra en cafes para ficha (teléfono, email, descripción, imagen)
alter table public.cafes
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists instagram text,
  add column if not exists description text,
  add column if not exists image_code text;

-- Personas autorizadas por cafetería (nombre/rol, no necesariamente profile)
create table if not exists public.cafe_staff (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  name text not null,
  role text not null,
  is_owner boolean not null default false,
  can_issue boolean not null default true,
  can_redeem boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_cafe_staff_cafe_id on public.cafe_staff(cafe_id);

-- Unicidad de image_code (opcional, para evitar duplicados)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'cafes_image_code_unique'
  ) then
    create unique index cafes_image_code_unique on public.cafes (image_code)
    where image_code is not null and image_code <> '';
  end if;
end $$;
