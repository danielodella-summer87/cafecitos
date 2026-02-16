create table if not exists public.settings_global (
  id boolean primary key default true,
  welcome_bonus_points integer not null default 5,
  max_assign_per_hour integer not null default 50,
  max_assign_per_day integer not null default 300,
  max_assign_per_month integer not null default 5000,
  max_redeem_per_day integer not null default 50,
  allow_cross_cafe_redeem boolean not null default true,
  show_membership_badge boolean not null default true,
  updated_at timestamptz not null default now()
);

-- singleton guard: siempre 1 fila
insert into public.settings_global (id)
values (true)
on conflict (id) do nothing;

-- si la tabla ya existía, aseguramos columnas
alter table public.settings_global
  add column if not exists welcome_bonus_points integer not null default 5;

alter table public.settings_global
  add column if not exists max_assign_per_hour integer not null default 50;

alter table public.settings_global
  add column if not exists max_assign_per_day integer not null default 300;

alter table public.settings_global
  add column if not exists max_assign_per_month integer not null default 5000;

alter table public.settings_global
  add column if not exists max_redeem_per_day integer not null default 50;

alter table public.settings_global
  add column if not exists allow_cross_cafe_redeem boolean not null default true;

alter table public.settings_global
  add column if not exists show_membership_badge boolean not null default true;

-- trigger updated_at simple
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_settings_global_updated_at on public.settings_global;
create trigger trg_settings_global_updated_at
before update on public.settings_global
for each row execute function public.set_updated_at();
