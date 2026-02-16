-- 1) settings_global: asegurar singleton row y columnas que la UI ya está usando
create table if not exists public.settings_global (
  id boolean primary key default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.settings_global (id) values (true)
on conflict (id) do nothing;

alter table public.settings_global
  add column if not exists welcome_bonus_points integer not null default 5;

alter table public.settings_global
  add column if not exists max_points_per_hour integer not null default 0;

alter table public.settings_global
  add column if not exists max_points_per_day integer not null default 0;

alter table public.settings_global
  add column if not exists max_points_per_month integer not null default 0;

alter table public.settings_global
  add column if not exists max_redeem_per_day integer not null default 0;

alter table public.settings_global
  add column if not exists allow_cross_cafe_redeem boolean not null default true;

alter table public.settings_global
  add column if not exists show_membership_badge boolean not null default true;

-- trigger updated_at (si no existe)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_settings_global_updated_at'
  ) then
    create trigger trg_settings_global_updated_at
    before update on public.settings_global
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- 2) profiles.tier_id (para "Socios")
alter table public.profiles
  add column if not exists tier_id uuid;

-- FK a tiers si existe la tabla tiers
do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='tiers') then
    begin
      alter table public.profiles
        add constraint profiles_tier_id_fkey
        foreign key (tier_id) references public.tiers(id)
        on update cascade on delete set null;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;

-- setear tier por defecto a consumidores existentes (si existe slug 'frecuente')
update public.profiles p
set tier_id = t.id
from public.tiers t
where p.role = 'consumer'
  and p.tier_id is null
  and t.slug = 'frecuente';
