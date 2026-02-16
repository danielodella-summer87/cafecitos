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

-- 2) seed tiers mínimos (si no existen)
insert into public.tiers (slug, name, min_points, badge_label, badge_message, dot_color, sort_order, is_active)
values
  ('frecuente','Frecuente',0,'Frecuente','Cliente frecuente · Sumás más rápido','#9CA3AF',10,true),
  ('plata','Plata',25,'Plata','Cliente frecuente · Sumás más rápido','#C0C0C0',20,true),
  ('oro','Oro',50,'Oro','Cliente destacado · Cafecitos extra en cada visita','#D4AF37',30,true),
  ('vip','VIP',100,'VIP','Cliente VIP · Prioridad + sorpresas','#111827',40,true),
  ('embajador','Embajador',200,'Embajador','Embajador · Beneficios exclusivos','#F97316',50,true)
on conflict (slug) do nothing;

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
