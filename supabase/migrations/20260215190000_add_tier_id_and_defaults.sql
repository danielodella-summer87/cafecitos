-- PRO platform: add tier_id + safe defaults
-- idempotente / seguro

-- 1) asegurar tiers (por si faltara en algún entorno)
create table if not exists public.tiers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  min_points int not null default 0,
  badge_label text,
  badge_message text,
  dot_color text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) asegurar columnas nuevas en tiers (compat con prod)
alter table public.tiers add column if not exists badge_label text;
alter table public.tiers add column if not exists badge_message text;
alter table public.tiers add column if not exists dot_color text;
alter table public.tiers add column if not exists sort_order integer not null default 0;
alter table public.tiers add column if not exists is_active boolean not null default true;

-- 2b) seed tiers mínimos (si no existen) - sin depender de ON CONFLICT
insert into public.tiers (slug, name, min_points, badge_label, badge_message, dot_color, sort_order, is_active)
select * from (
  select
    'starter'::text as slug,
    'Starter'::text as name,
    0::int as min_points,
    'Starter'::text as badge_label,
    'Sumando puntos'::text as badge_message,
    '#111111'::text as dot_color,
    10::int as sort_order,
    true::boolean as is_active
  where not exists (select 1 from public.tiers t where t.slug = 'starter')

  union all
  select
    'pro'::text,
    'Pro'::text,
    1000::int,
    'Pro'::text,
    'Nivel Pro'::text,
    '#111111'::text,
    20::int,
    true::boolean
  where not exists (select 1 from public.tiers t where t.slug = 'pro')
) s;

-- 3) agregar tier_id a profiles si no existe
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='profiles'
      and column_name='tier_id'
  ) then
    alter table public.profiles
      add column tier_id uuid null;
  end if;
end$$;

-- 4) FK a tiers (si no existe)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_tier_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_tier_id_fkey
      foreign key (tier_id) references public.tiers(id)
      on delete set null;
  end if;
end$$;

-- 5) set default tier a 'frecuente' para los que no tengan
update public.profiles p
set tier_id = t.id
from public.tiers t
where t.slug='frecuente'
  and p.tier_id is null;

-- 6) si is_active faltara (por entornos viejos)
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='profiles'
      and column_name='is_active'
  ) then
    alter table public.profiles add column is_active boolean not null default true;
  end if;
end$$;
