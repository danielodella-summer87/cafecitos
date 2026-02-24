-- Promotions + asignación a cafeterías
-- Owner/staff no afecta esto. Solo admin crea promos.
-- Ejecutar luego con: supabase db push

create extension if not exists pgcrypto;

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  image_url text,
  scope text not null default 'specific' check (scope in ('global','specific')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promotion_cafes (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (promotion_id, cafe_id)
);

create index if not exists promotion_cafes_cafe_id_idx on public.promotion_cafes (cafe_id);
create index if not exists promotions_active_idx on public.promotions (is_active);

-- updated_at trigger (safe)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at') then
    create or replace function public.set_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_promotions_updated_at') then
    create trigger trg_promotions_updated_at
    before update on public.promotions
    for each row execute function public.set_updated_at();
  end if;
end $$;
