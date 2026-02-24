-- Pre-migration check para 20260302120000_harden_cafe_staff.
-- NO ejecutar migrations hasta validar resultados y backups.

-- Conteo de filas inválidas
select count(*) as null_profile_id_rows from public.cafe_staff where profile_id is null;

-- Ver roles fuera de admin/staff
select distinct role from public.cafe_staff where role not in ('admin','staff');

-- Ver si ya existe constraint cafe_staff_role_check
select conname
from pg_constraint
where conrelid = 'public.cafe_staff'::regclass;

-- (Opcional) Ver si profile_id ya es NOT NULL
select column_name, is_nullable
from information_schema.columns
where table_schema='public' and table_name='cafe_staff' and column_name='profile_id';
