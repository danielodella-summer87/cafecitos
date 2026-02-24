-- PARTE 4 — Hardening: cafe_staff solo para personal operativo (admin/staff).
-- NO EJECUTAR hasta validar datos y backups.
-- Owner vive solo en profiles (role=owner, cafe_id); no debe existir en cafe_staff.

-- 1) Eliminar filas inválidas (sin profile_id)
delete from public.cafe_staff where profile_id is null;

-- 2) Constraint: roles permitidos solo 'admin' y 'staff'
alter table public.cafe_staff
  add constraint cafe_staff_role_check
  check (role in ('admin','staff'));

-- 3) profile_id obligatorio
alter table public.cafe_staff
  alter column profile_id set not null;
