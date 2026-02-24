-- Queries de verificación (ejecutar en Supabase SQL Editor). NO cambiar datos.

-- 1) Cafes: image_code e image_path (cafes NO tiene image_url)
SELECT id, name, image_code, image_path
FROM public.cafes
ORDER BY name;

-- 2) Promotions: image_path e image_url
SELECT id, title, image_path, image_url, is_active, starts_at, ends_at
FROM public.promotions
ORDER BY id;

-- 3) Tabla puente: promotion_cafes (promotion_id, cafe_id)
SELECT * FROM public.promotion_cafes
ORDER BY cafe_id, promotion_id
LIMIT 50;

-- 4) Promos activas por cafetería (NULL-safe en fechas). Reemplazá '<UUID de la cafetería>' por el id real.
-- SELECT p.id, p.title, p.is_active, p.starts_at, p.ends_at, p.image_path, p.image_url
-- FROM public.promotions p
-- JOIN public.promotion_cafes pc ON pc.promotion_id = p.id
-- WHERE pc.cafe_id = '<UUID de la cafetería>'
--   AND p.is_active = true
--   AND (p.starts_at IS NULL OR p.starts_at <= now())
--   AND (p.ends_at   IS NULL OR p.ends_at   >= now());
