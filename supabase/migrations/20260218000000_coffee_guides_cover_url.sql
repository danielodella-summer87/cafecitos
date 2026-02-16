-- Asignar cover_url a guías de Universo Café (imágenes en /public/universo-cafe/)
UPDATE public.coffee_guides
SET cover_url = CASE
  WHEN title ILIKE 'Café filtrado vs Espresso%' THEN '/universo-cafe/cafe-filtrado-vs-espresso.png'
  WHEN title ILIKE 'Prensa francesa%' THEN '/universo-cafe/prensa-francesa.png'
  WHEN title ILIKE 'V60 / Pour Over%' OR title ILIKE 'V60%' THEN '/universo-cafe/v60-pour-over.png'
  WHEN title ILIKE 'Cafetera italiana%' OR title ILIKE '%Moka%' THEN '/universo-cafe/moka-italiana.png'
  WHEN title ILIKE 'Orígenes:%' THEN '/universo-cafe/origenes-brasil-colombia-etiopia.png'
  WHEN title ILIKE 'Acidez vs Amargor%' THEN '/universo-cafe/acidez-vs-amargor.png'
  ELSE cover_url
END
WHERE category IN ('metodos', 'origenes', 'tipos', 'premium');
