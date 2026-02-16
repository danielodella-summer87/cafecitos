-- Universo Café PRO: schema coffee_guides + coffee_guide_views

-- 1) Ajustar coffee_guides si ya existe (añadir columnas nuevas)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'coffee_guides') then
    alter table public.coffee_guides add column if not exists excerpt text not null default '';
    alter table public.coffee_guides add column if not exists cover_url text;
    alter table public.coffee_guides add column if not exists reading_minutes int not null default 3;
    alter table public.coffee_guides add column if not exists content_json jsonb not null default '{}'::jsonb;
  end if;
end $$;

-- 2) Crear tabla coffee_guides con schema completo si no existe
create table if not exists public.coffee_guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  cover_url text,
  category text not null,
  min_tier_slug text not null default 'starter',
  reading_minutes int not null default 3,
  content_json jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Asegurar columnas en caso de create table if not exists con tabla ya existente
alter table public.coffee_guides add column if not exists excerpt text not null default '';
alter table public.coffee_guides add column if not exists cover_url text;
alter table public.coffee_guides add column if not exists reading_minutes int not null default 3;
alter table public.coffee_guides add column if not exists content_json jsonb not null default '{}'::jsonb;

-- Constraint opcional: categorías permitidas
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coffee_guides_category_check'
  ) then
    alter table public.coffee_guides
      add constraint coffee_guides_category_check
      check (category in ('tipos','metodos','origenes','premium'));
  end if;
exception
  when others then null; -- ignorar si falla (ej. valores existentes)
end $$;

-- 3) Vistas de progreso por usuario
create table if not exists public.coffee_guide_views (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  guide_id uuid not null references public.coffee_guides(id) on delete cascade,
  progress_pct int not null default 0,
  completed_at timestamptz null,
  updated_at timestamptz default now(),
  primary key (profile_id, guide_id)
);

create index if not exists idx_coffee_guide_views_profile_id on public.coffee_guide_views(profile_id);
create index if not exists idx_coffee_guide_views_guide_id on public.coffee_guide_views(guide_id);
