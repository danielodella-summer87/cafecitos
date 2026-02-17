-- Asegurar columna welcome_seen_at para onboarding (evitar error en Vercel/prod)
alter table public.profiles
  add column if not exists welcome_seen_at timestamptz;

select pg_notify('pgrst', 'reload schema');
