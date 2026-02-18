-- PARTE B — Credenciales staff en cafe_staff + validaciones + vista opcional
-- Ejecutar en Supabase SQL Editor si las columnas cedula/pin_hash ya existen por migración anterior.

-- 1) Asegurar columnas para login staff
alter table public.cafe_staff
  add column if not exists cedula text,
  add column if not exists pin_hash text;

-- 2) Validaciones básicas (solo dígitos en cédula; hash con longitud mínima)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cafe_staff_cedula_digits_chk') then
    alter table public.cafe_staff
      add constraint cafe_staff_cedula_digits_chk
      check (cedula is null or cedula ~ '^[0-9]+$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cafe_staff_pin_hash_len_chk') then
    alter table public.cafe_staff
      add constraint cafe_staff_pin_hash_len_chk
      check (pin_hash is null or length(pin_hash) >= 20);
  end if;
end $$;

-- 3) Unicidad por cafetería (una misma cédula no puede repetirse en la misma cafetería)
create unique index if not exists cafe_staff_cafeid_cedula_uq
  on public.cafe_staff (cafe_id, cedula)
  where cedula is not null;

-- 4) Vista útil para owner panel (evita repetir joins; solo cafe_staff)
create or replace view public.v_cafe_staff_owner as
select
  cs.id as cafe_staff_id,
  cs.cafe_id,
  cs.full_name,
  cs.role,
  cs.is_active,
  cs.can_issue,
  cs.can_redeem,
  cs.is_owner,
  cs.cedula,
  cs.created_at
from public.cafe_staff cs;
