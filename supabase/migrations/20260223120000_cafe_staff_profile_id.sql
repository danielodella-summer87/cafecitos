-- Vincular cafe_staff a profile para permisos STAFF vs OWNER (login con role=owner + cafe_id)
-- Idempotente: seguro ante re-ejecución.

-- 1) Columna. Sin FK inline a propósito: "ADD COLUMN IF NOT EXISTS ... REFERENCES ..."
--    ignora el REFERENCES si la columna ya existía (caso real en prod: remote_schema
--    la creó antes sin FK), dejando la relación sin crear. Por eso la FK se agrega aparte.
alter table public.cafe_staff
  add column if not exists profile_id uuid;

-- 2) FK cafe_staff.profile_id -> profiles.id, creada por separado y solo si no existe.
--    Nombre fijo: cafe_staff_profile_id_fkey (debe coincidir con el de prod).
--    ON DELETE CASCADE: coherente con el estado real en prod y con que profile_id
--    pasa a NOT NULL en migraciones posteriores (ON DELETE SET NULL sería incompatible).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_staff_profile_id_fkey'
      and conrelid = 'public.cafe_staff'::regclass
  ) then
    alter table public.cafe_staff
      add constraint cafe_staff_profile_id_fkey
      foreign key (profile_id) references public.profiles(id)
      on delete cascade;
  end if;
end $$;

-- 3) Índice de apoyo para joins/embeds por profile_id.
create index if not exists idx_cafe_staff_profile_id on public.cafe_staff(profile_id);
