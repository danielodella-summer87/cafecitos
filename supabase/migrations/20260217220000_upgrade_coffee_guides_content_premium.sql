-- Upgrade content_json a formato premium (section, callout, steps) para guías existentes.
-- Las guías no actualizadas siguen viéndose vía normalizer en el front (h2 -> section, etc.).
-- Identificación por title (la tabla no tiene columna slug).

-- 1) Café filtrado vs Espresso: sections + callout tip
UPDATE public.coffee_guides
SET
  content_json = '{
    "blocks": [
      {"type": "section", "title": "Filtrado", "variant": "neutral", "icon": "☕"},
      {"type": "bullets", "items": [
        "Más liviano y aromático.",
        "Ideal para tomar lento.",
        "Notas más claras (frutas, flores)."
      ]},
      {"type": "section", "title": "Espresso", "variant": "neutral", "icon": "☕"},
      {"type": "bullets", "items": [
        "Más intenso y concentrado.",
        "Más cuerpo, crema.",
        "Más sensible a la molienda y al tiempo."
      ]},
      {"type": "callout", "variant": "tip", "title": "Tip práctico", "text": "Si te gusta \"suave\" y perfumado: filtrado. Si te gusta \"corto y fuerte\": espresso."}
    ]
  }'::jsonb,
  cover_url = COALESCE(NULLIF(trim(cover_url), ''), '/universo-cafe/cafe-filtrado-vs-espresso.png')
WHERE title ILIKE 'Café filtrado vs Espresso%';

-- 2) Cafetera italiana (Moka): section warning + steps + callout tip
UPDATE public.coffee_guides
SET
  content_json = '{
    "blocks": [
      {"type": "section", "title": "Errores típicos", "variant": "warning", "icon": "⚠️"},
      {"type": "bullets", "items": [
        "Café demasiado fino (se quema).",
        "Fuego muy alto (se amarga).",
        "Dejar que hierva fuerte y \"escupa\"."
      ]},
      {"type": "section", "title": "Receta simple", "variant": "neutral", "icon": "✅"},
      {"type": "steps", "items": [
        "Poné agua caliente en la base (sin pasar la válvula).",
        "Café en el filtro sin presionar.",
        "Fuego bajo/medio.",
        "Cuando salga el café y cambie a burbujeo claro, apagá."
      ]},
      {"type": "callout", "variant": "tip", "text": "Apagá antes de que \"chille\". Eso suele ser lo amargo."}
    ]
  }'::jsonb,
  cover_url = COALESCE(NULLIF(trim(cover_url), ''), '/universo-cafe/moka-italiana.png')
WHERE title ILIKE 'Cafetera italiana (Moka)%';

-- 3) Prensa francesa: sections + steps + callout tip
UPDATE public.coffee_guides
SET
  content_json = '{
    "blocks": [
      {"type": "section", "title": "Lo que necesitás", "variant": "neutral", "icon": "☕"},
      {"type": "bullets", "items": [
        "Café molido grueso.",
        "Agua caliente (sin hervir).",
        "Prensa francesa."
      ]},
      {"type": "section", "title": "Receta simple", "variant": "neutral", "icon": "✅"},
      {"type": "steps", "items": [
        "Calentá la jarra con un poco de agua y descartá.",
        "Agregá café: 1 cucharada sopera por cada 100–120 ml.",
        "Verté agua, revolvé suave.",
        "Esperá 4 minutos.",
        "Bajá el émbolo lento y serví."
      ]},
      {"type": "callout", "variant": "tip", "text": "Si queda muy amargo, bajá el tiempo a 3:30 o usá molienda más gruesa."}
    ]
  }'::jsonb,
  cover_url = COALESCE(NULLIF(trim(cover_url), ''), '/universo-cafe/prensa-francesa.png')
WHERE title ILIKE 'Prensa francesa (French Press)%';

-- Opcional: setear cover_url para otras guías que tengan imagen por slug
UPDATE public.coffee_guides SET cover_url = '/universo-cafe/v60-pour-over.png' WHERE title ILIKE 'V60 / Pour Over%' AND (cover_url IS NULL OR trim(cover_url) = '');
UPDATE public.coffee_guides SET cover_url = '/universo-cafe/origenes-brasil-colombia-etiopia.png' WHERE title ILIKE 'Orígenes:%' AND (cover_url IS NULL OR trim(cover_url) = '');
UPDATE public.coffee_guides SET cover_url = '/universo-cafe/acidez-vs-amargor.png' WHERE title ILIKE 'Acidez vs Amargor%' AND (cover_url IS NULL OR trim(cover_url) = '');
