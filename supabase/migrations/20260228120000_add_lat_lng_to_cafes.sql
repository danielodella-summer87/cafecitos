-- Geocoding cache en cafes (Nominatim): lat/lng + metadata
alter table public.cafes
  add column if not exists lat numeric,
  add column if not exists lng numeric,
  add column if not exists geocoded_at timestamptz,
  add column if not exists geocode_source text default 'nominatim',
  add column if not exists geocode_query text;
