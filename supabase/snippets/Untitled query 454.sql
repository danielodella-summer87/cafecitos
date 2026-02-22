alter table public.cafes
add column if not exists lat double precision;

alter table public.cafes
add column if not exists lng double precision;