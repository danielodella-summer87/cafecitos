-- Extensiones útiles
create extension if not exists "pgcrypto";

-- 1) Roles de la app
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'owner', 'consumer');
  end if;
end$$;

-- 2) Perfiles (unifica admin/owner/consumer)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null default 'consumer',
  full_name text not null,
  cedula text not null unique,
  pin_hash text not null,
  phone_last4 text,
  created_at timestamptz not null default now()
);

-- 3) Cafeterías (tenants)
create table if not exists public.cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4) Dueños/encargados asociados a una cafetería
create table if not exists public.cafe_owners (
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cafe_id, profile_id)
);

-- 5) Wallet simple (saldo actual) por consumidor
create table if not exists public.wallets (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0,
  lifetime_earned integer not null default 0, -- para nivel VIP
  updated_at timestamptz not null default now()
);

-- 6) Movimientos (ledger): suma/canje/transfer
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tx_type') then
    create type public.tx_type as enum ('earn', 'redeem', 'transfer_out', 'transfer_in', 'adjust');
  end if;
end$$;

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  tx_type public.tx_type not null,
  cafe_id uuid references public.cafes(id) on delete set null,
  actor_owner_profile_id uuid references public.profiles(id) on delete set null,
  from_profile_id uuid references public.profiles(id) on delete set null,
  to_profile_id uuid references public.profiles(id) on delete set null,
  amount integer not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

-- 7) Trigger: mantener wallet balance/lifetime con los movimientos
create or replace function public.apply_point_transaction()
returns trigger as $$
begin
  -- asegurar wallets existan si aplica
  if new.to_profile_id is not null then
    insert into public.wallets(profile_id) values (new.to_profile_id)
    on conflict (profile_id) do nothing;
  end if;

  if new.from_profile_id is not null then
    insert into public.wallets(profile_id) values (new.from_profile_id)
    on conflict (profile_id) do nothing;
  end if;

  if new.tx_type = 'earn' then
    update public.wallets
      set balance = balance + new.amount,
          lifetime_earned = lifetime_earned + new.amount,
          updated_at = now()
    where profile_id = new.to_profile_id;

  elsif new.tx_type = 'redeem' then
    update public.wallets
      set balance = balance - new.amount,
          updated_at = now()
    where profile_id = new.from_profile_id;

  elsif new.tx_type = 'transfer_out' then
    update public.wallets
      set balance = balance - new.amount,
          updated_at = now()
    where profile_id = new.from_profile_id;

  elsif new.tx_type = 'transfer_in' then
    update public.wallets
      set balance = balance + new.amount,
          updated_at = now()
    where profile_id = new.to_profile_id;

  elsif new.tx_type = 'adjust' then
    -- ajuste: si to_profile_id viene, suma; si from_profile_id viene, resta (simple)
    if new.to_profile_id is not null then
      update public.wallets
        set balance = balance + new.amount,
            lifetime_earned = lifetime_earned + new.amount,
            updated_at = now()
      where profile_id = new.to_profile_id;
    elsif new.from_profile_id is not null then
      update public.wallets
        set balance = balance - new.amount,
            updated_at = now()
      where profile_id = new.from_profile_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_apply_point_transaction on public.point_transactions;
create trigger trg_apply_point_transaction
after insert on public.point_transactions
for each row execute function public.apply_point_transaction();

-- 8) Regla simple: no permitir saldo negativo en redeem/transfer_out
create or replace function public.prevent_negative_balance()
returns trigger as $$
declare
  current_balance integer;
begin
  if new.tx_type in ('redeem', 'transfer_out') then
    select balance into current_balance from public.wallets where profile_id = new.from_profile_id;

    if current_balance is null then
      raise exception 'wallet not found';
    end if;

    if current_balance < new.amount then
      raise exception 'insufficient balance';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_prevent_negative_balance on public.point_transactions;
create trigger trg_prevent_negative_balance
before insert on public.point_transactions
for each row execute function public.prevent_negative_balance();