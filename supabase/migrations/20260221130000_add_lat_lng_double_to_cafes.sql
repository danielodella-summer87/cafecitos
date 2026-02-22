-- Lat/lng manuales para cafés (formulario admin). Idempotente.
alter table public.cafes
  add column if not exists lat double precision,
  add column if not exists lng double precision;
