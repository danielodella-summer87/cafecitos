-- 1) tier_id en profiles (si faltara)
alter table public.profiles
  add column if not exists tier_id uuid;

-- Si tiers existe, dejamos FK (si no existe, no rompe por el IF NOT EXISTS de la columna)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema='public' and table_name='tiers'
  ) then
    -- Crear FK solo si no existe
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
  end if;
end $$;

create index if not exists idx_profiles_tier_id on public.profiles(tier_id);

-- 2) is_active en cafes (si faltara)
alter table public.cafes
  add column if not exists is_active boolean not null default true;
