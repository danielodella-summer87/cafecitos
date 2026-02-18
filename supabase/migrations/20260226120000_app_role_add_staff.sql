-- Permitir role 'staff' en public.profiles para empleados creados por dueño
alter type public.app_role add value if not exists 'staff';
