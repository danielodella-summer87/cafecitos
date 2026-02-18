-- Vincular cafe_staff a profile para permisos STAFF vs OWNER (login con role=owner + cafe_id)
alter table public.cafe_staff
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_cafe_staff_profile_id on public.cafe_staff(profile_id);
