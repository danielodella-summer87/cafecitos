-- 0) EXT (por si falta en cloud)
create extension if not exists pgcrypto;

-- 1) SETTINGS GLOBALES (1 fila)
create table if not exists public.settings_global (
  id boolean primary key default true,
  welcome_bonus_points integer not null default 5,              -- cortesía al registrarse
  max_points_per_hour integer not null default 50,              -- límite por cafetería/owner
  max_points_per_day integer not null default 300,
  max_points_per_month integer not null default 6000,
  max_redeem_per_day integer not null default 50,               -- límite de canje por cliente
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint settings_global_singleton check (id = true)
);

insert into public.settings_global (id)
values (true)
on conflict (id) do nothing;

-- trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_settings_updated_at on public.settings_global;
create trigger trg_settings_updated_at
before update on public.settings_global
for each row execute function public.set_updated_at();

-- 2) TIERS / MEMBRESÍAS (tipo Starbucks)
create table if not exists public.tiers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- ej: frecuente, plata, oro, vip, embajador
  name text not null,                        -- ej: Cliente Plata
  min_points integer not null default 0,     -- umbral (saldo global)
  badge_text text not null default '',       -- ej: "Cliente VIP · Cafecitos extra en cada visita"
  badge_bg text not null default '#000000',  -- barra negra por defecto
  badge_fg text not null default '#ffffff',  -- letras blancas
  dot_color text not null default '#22c55e', -- se usa para el circulito (plata/oro/etc)
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

drop trigger if exists trg_tiers_updated_at on public.tiers;
create trigger trg_tiers_updated_at
before update on public.tiers
for each row execute function public.set_updated_at();

-- Seed tiers (si no existen)
insert into public.tiers (slug, name, min_points, badge_text, dot_color, sort_order)
values
  ('frecuente','Cliente Frecuente', 0,  'Cliente Frecuente · Sumá cafecitos en cada visita', '#22c55e', 10),
  ('plata','Cliente Plata',        25, 'Cliente Plata · Beneficios extra por fidelidad',     '#c0c0c0', 20),
  ('oro','Cliente Oro',            75, 'Cliente Oro · Canjes premium y sorpresas',           '#d4af37', 30),
  ('vip','Cliente VIP',            150,'Cliente VIP · Cafecitos extra en cada visita',       '#ffffff', 40),
  ('embajador','Embajador',        300,'Embajador · Beneficios secretos y regalos',          '#ff4d4d', 50)
on conflict (slug) do nothing;

-- 3) REWARDS / CANJES CONFIGURABLES
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,                          -- ej: "Café gratis"
  description text not null default '',
  cost_points integer not null default 10,       -- cuántos cafecitos cuesta
  is_global boolean not null default true,       -- global o por cafetería
  cafe_id uuid references public.cafes(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_rewards_cafe on public.rewards(cafe_id);

drop trigger if exists trg_rewards_updated_at on public.rewards;
create trigger trg_rewards_updated_at
before update on public.rewards
for each row execute function public.set_updated_at();

-- 4) PROFILES: ACTIVE + TIER
alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  add column if not exists tier_id uuid references public.tiers(id) on delete set null;

create index if not exists idx_profiles_is_active on public.profiles(is_active);
create index if not exists idx_profiles_tier_id on public.profiles(tier_id);

-- 5) CAFES: ACTIVE (para poder pausar una cafetería)
alter table public.cafes
  add column if not exists is_active boolean not null default true;

create index if not exists idx_cafes_is_active on public.cafes(is_active);
