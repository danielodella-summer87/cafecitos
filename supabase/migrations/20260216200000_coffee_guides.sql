create table if not exists public.coffee_guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null,
  min_tier_slug text not null default 'starter',
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);
