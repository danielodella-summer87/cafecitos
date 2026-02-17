-- hours_text en cafes (para consumer modal)
alter table public.cafes
  add column if not exists hours_text text;

-- Reseñas por cafetería (consumer)
create table if not exists public.cafe_reviews (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(cafe_id, profile_id)
);

create index if not exists idx_cafe_reviews_cafe_id on public.cafe_reviews(cafe_id);

-- Vista: estadísticas de reseñas por cafetería
create or replace view public.v_cafe_reviews_stats as
select
  cafe_id,
  coalesce(round(avg(rating)::numeric, 2), 0)::double precision as avg_rating,
  count(*)::bigint as reviews_count
from public.cafe_reviews
group by cafe_id;

-- Tabla promos por cafetería (para "promos activas" en modal)
create table if not exists public.cafe_promos (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  title text not null,
  description text,
  image_code text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_cafe_promos_cafe_id on public.cafe_promos(cafe_id);

-- Vista: promos activas por cafetería
create or replace view public.v_cafe_promos_active as
select
  cafe_id,
  id as promo_id,
  title,
  description,
  image_code
from public.cafe_promos
where is_active = true;
