-- Convención: image_path TEXT NULL con path completo (ej. media/cafes/C-001.png, media/promos/P-001.webp).
-- No asumir extensión en código; la DB siempre trae el path completo.

-- Cafés
alter table public.cafes
  add column if not exists image_path text;

-- Promociones (tabla promotions)
alter table public.promotions
  add column if not exists image_path text;

-- Comentarios para documentar convención
comment on column public.cafes.image_path is 'Path completo de imagen, ej. media/cafes/C-001.png';
comment on column public.promotions.image_path is 'Path completo de imagen, ej. media/promos/P-001.webp';
