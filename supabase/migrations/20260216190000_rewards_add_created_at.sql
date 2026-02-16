-- Ensure rewards has created_at / updated_at and trigger to keep updated_at
do $$
begin
  -- created_at
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='rewards' and column_name='created_at'
  ) then
    alter table public.rewards
      add column created_at timestamptz not null default now();
  end if;

  -- updated_at
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='rewards' and column_name='updated_at'
  ) then
    alter table public.rewards
      add column updated_at timestamptz not null default now();
  end if;
end $$;

-- Backfill (por si existían filas y la columna quedó null en algún edge-case)
update public.rewards
set created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

-- updated_at trigger function (si no existe)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- trigger (si no existe)
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_rewards_updated_at'
  ) then
    create trigger trg_rewards_updated_at
    before update on public.rewards
    for each row execute function public.set_updated_at();
  end if;
end $$;
