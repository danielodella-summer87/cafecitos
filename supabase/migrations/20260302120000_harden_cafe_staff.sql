-- Hardening: cafe_staff solo para personal operativo (admin/staff).
-- Owner vive solo en profiles (role=owner, cafe_id); no debe existir en cafe_staff.

-- 1) Limpiar filas inválidas (sin profile_id)
delete from public.cafe_staff where profile_id is null;

-- 2) Constraint role: crear solo si no existe
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_staff_role_check'
      and conrelid = 'public.cafe_staff'::regclass
  ) then
    alter table public.cafe_staff
      add constraint cafe_staff_role_check
      check (role in ('admin','staff'));
  end if;
end $$;

-- 3) profile_id obligatorio (idempotente)
alter table public.cafe_staff
  alter column profile_id set not null;
