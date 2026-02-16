-- Seed inicial: Universo Café (tono simple, público general)
-- Requiere tabla public.coffee_guides (con content_json jsonb)

insert into public.coffee_guides
(title, excerpt, cover_url, category, min_tier_slug, reading_minutes, content_json, is_active, sort_order)
values

-- 1) Tipos
(
  '¿Qué es el café de especialidad?',
  'Una guía simple para entender por qué algunos cafés "saben mejor" y cómo se evalúan.',
  null,
  'tipos',
  'starter',
  4,
  '{
    "blocks":[
      {"type":"h2","text":"Idea rápida"},
      {"type":"p","text":"Café de especialidad no es \"café caro\": es café con trazabilidad, buen proceso y control de calidad (desde el origen hasta la taza)."},
      {"type":"h2","text":"¿Qué lo hace diferente?"},
      {"type":"bullets","items":[
        "Origen identificado (finca, región, país).",
        "Cosecha y proceso cuidados (lavado, natural, honey).",
        "Tueste pensado para resaltar sabores, no para taparlos.",
        "Preparación con medidas consistentes (agua, tiempo, molienda)."
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si el café te deja un sabor agradable (chocolate, frutas, caramelo) y no solo amargor, vas bien."}
    ]
  }'::jsonb,
  true,
  10
),

(
  'Arábica vs Robusta (sin drama)',
  'Diferencias claras: sabor, cafeína y por qué existen mezclas.',
  null,
  'tipos',
  'starter',
  3,
  '{
    "blocks":[
      {"type":"h2","text":"Arábica"},
      {"type":"bullets","items":[
        "Suele ser más aromático y suave.",
        "Más notas dulces/frutales.",
        "Menos cafeína (en general)."
      ]},
      {"type":"h2","text":"Robusta"},
      {"type":"bullets","items":[
        "Más cafeína y más amargor.",
        "Cuerpo más fuerte.",
        "Se usa mucho en blends para crema en espresso."
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si te cae pesado o muy amargo, probá un arábica o un blend con menor robusta."}
    ]
  }'::jsonb,
  true,
  20
),

(
  'Tueste: claro, medio u oscuro',
  'Cómo impacta el tueste en el sabor (y por qué el oscuro no es "más fuerte").',
  null,
  'tipos',
  'starter',
  3,
  '{
    "blocks":[
      {"type":"p","text":"El tueste cambia los aromas y sabores. \"Más oscuro\" suele ser más tostado/ahumado, no necesariamente más cafeína."},
      {"type":"h2","text":"Guía rápida de sabor"},
      {"type":"bullets","items":[
        "Claro: más ácido, más frutal, más floral.",
        "Medio: balance (dulzor + aroma).",
        "Oscuro: más amargo, notas a cacao amargo/tostado."
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si querés café \"suave\" pero sabroso, empezá por tueste medio."}
    ]
  }'::jsonb,
  true,
  30
),

-- 2) Métodos
(
  'Café filtrado vs Espresso (en 2 minutos)',
  'Cuál elegir según tu gusto: intensidad, cuerpo y amargor.',
  null,
  'metodos',
  'starter',
  3,
  '{
    "blocks":[
      {"type":"h2","text":"Filtrado"},
      {"type":"bullets","items":[
        "Más liviano y aromático.",
        "Ideal para tomar lento.",
        "Notas más claras (frutas, flores)."
      ]},
      {"type":"h2","text":"Espresso"},
      {"type":"bullets","items":[
        "Más intenso y concentrado.",
        "Más cuerpo, crema.",
        "Más sensible a la molienda y al tiempo."
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si te gusta \"suave\" y perfumado: filtrado. Si te gusta \"corto y fuerte\": espresso."}
    ]
  }'::jsonb,
  true,
  10
),

(
  'Prensa francesa (French Press): paso a paso',
  'Un método fácil para lograr un café con cuerpo en casa.',
  null,
  'metodos',
  'starter',
  5,
  '{
    "blocks":[
      {"type":"h2","text":"Lo que necesitás"},
      {"type":"bullets","items":[
        "Café molido grueso.",
        "Agua caliente (sin hervir).",
        "Prensa francesa."
      ]},
      {"type":"h2","text":"Receta simple"},
      {"type":"bullets","items":[
        "1) Calentá la jarra con un poco de agua y descartá.",
        "2) Agregá café: 1 cucharada sopera por cada 100–120 ml.",
        "3) Verté agua, revolvé suave.",
        "4) Esperá 4 minutos.",
        "5) Bajá el émbolo lento y serví."
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si queda muy amargo, bajá el tiempo a 3:30 o usá molienda más gruesa."}
    ]
  }'::jsonb,
  true,
  20
),

(
  'V60 / Pour Over: la receta más simple',
  'Cómo hacer un filtrado limpio y con buen aroma.',
  null,
  'metodos',
  'starter',
  5,
  '{
    "blocks":[
      {"type":"h2","text":"Lo básico"},
      {"type":"bullets","items":[
        "Filtro + V60",
        "Café molido medio (tipo sal fina)",
        "Agua caliente",
        "Jarra o taza"
      ]},
      {"type":"h2","text":"Pasos"},
      {"type":"bullets","items":[
        "1) Enjuagá el filtro con agua caliente (saca gusto a papel).",
        "2) Café: 15 g (aprox. 2 cucharadas colmadas).",
        "3) Bloom: 30–40 g de agua, esperar 30 segundos.",
        "4) Verté el resto hasta 250 g total, en círculos suaves.",
        "5) Tiempo total: 2:30–3:30."
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si sale aguado, mole un poco más fino. Si sale amargo, mole más grueso o verté más suave."}
    ]
  }'::jsonb,
  true,
  30
),

(
  'Cafetera italiana (Moka): que no amargue',
  'El clásico de casa: errores comunes y cómo evitarlos.',
  null,
  'metodos',
  'starter',
  4,
  '{
    "blocks":[
      {"type":"h2","text":"Errores típicos"},
      {"type":"bullets","items":[
        "Café demasiado fino (se quema).",
        "Fuego muy alto (se amarga).",
        "Dejar que hierva fuerte y \"escupa\"."
      ]},
      {"type":"h2","text":"Receta simple"},
      {"type":"bullets","items":[
        "1) Poné agua caliente en la base (sin pasar la válvula).",
        "2) Café en el filtro sin presionar.",
        "3) Fuego bajo/medio.",
        "4) Cuando salga el café y cambie a burbujeo claro, apagá."
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Apagá antes de que \"chille\". Eso suele ser lo amargo."}
    ]
  }'::jsonb,
  true,
  40
),

-- 3) Orígenes / perfiles
(
  'Orígenes: Brasil, Colombia, Etiopía (rápido)',
  'Qué esperar en sabor según el país.',
  null,
  'origenes',
  'starter',
  4,
  '{
    "blocks":[
      {"type":"h2","text":"Brasil"},
      {"type":"p","text":"Suele ser más chocolate, nuez, cuerpo. Muy amigable."},
      {"type":"h2","text":"Colombia"},
      {"type":"p","text":"Balanceado: dulzor + algo de acidez agradable."},
      {"type":"h2","text":"Etiopía"},
      {"type":"p","text":"Más floral/frutal, aroma fuerte. Ideal en filtrados."},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si recién empezás: probá Brasil o Colombia en tueste medio."}
    ]
  }'::jsonb,
  true,
  10
),

(
  'Acidez vs Amargor: cómo entenderlo',
  'La acidez no es "malo": te explico cómo identificarla.',
  null,
  'origenes',
  'starter',
  4,
  '{
    "blocks":[
      {"type":"h2","text":"Acidez (bien entendida)"},
      {"type":"p","text":"Es una sensación fresca: tipo manzana, cítrico, uva. No es \"agrio\" desagradable."},
      {"type":"h2","text":"Amargor"},
      {"type":"p","text":"Puede venir de tueste muy oscuro o extracción pasada."},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si te raspa la garganta: probablemente amargor/extracción. Si te da sensación fresca: acidez."}
    ]
  }'::jsonb,
  true,
  20
),

(
  'Molienda: el secreto más fácil de mejorar',
  'Si ajustás la molienda, mejorás el café más que con cualquier "truco".',
  null,
  'origenes',
  'starter',
  4,
  '{
    "blocks":[
      {"type":"h2","text":"Regla de oro"},
      {"type":"p","text":"Más fino = extrae más rápido y fuerte. Más grueso = más suave."},
      {"type":"h2","text":"Guía rápida"},
      {"type":"bullets","items":[
        "Espresso: fino",
        "Moka: medio-fino",
        "V60: medio",
        "Prensa francesa: grueso"
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si tu café está amargo: probá más grueso. Si está aguado: probá más fino."}
    ]
  }'::jsonb,
  true,
  30
),

-- 4) Premium (pero por ahora starter)
(
  'Latte y cappuccino en casa (sin máquinas pro)',
  'Cómo espumar leche en casa y qué cambia entre latte y cappuccino.',
  null,
  'premium',
  'starter',
  5,
  '{
    "blocks":[
      {"type":"h2","text":"Latte vs Cappuccino"},
      {"type":"bullets","items":[
        "Latte: más leche, menos espuma.",
        "Cappuccino: menos leche, más espuma."
      ]},
      {"type":"h2","text":"Espumar en casa (simple)"},
      {"type":"bullets","items":[
        "Opción 1: frasco con tapa (agitar fuerte 20–30s) + microondas 20–30s.",
        "Opción 2: batidor de mano (milk frother)."
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Usá leche bien fría y no la hiervas: calentá hasta que esté \"bien caliente\" pero sin burbujas grandes."}
    ]
  }'::jsonb,
  true,
  10
),

(
  'Cómo guardar café para que no pierda sabor',
  'El aire, la luz y la humedad son los enemigos.',
  null,
  'premium',
  'starter',
  3,
  '{
    "blocks":[
      {"type":"h2","text":"Lo que sí"},
      {"type":"bullets","items":[
        "Recipiente hermético.",
        "Lugar fresco y oscuro.",
        "Comprar en cantidades que consumas en 2–3 semanas."
      ]},
      {"type":"h2","text":"Lo que no"},
      {"type":"bullets","items":[
        "Frasco abierto en la cocina.",
        "Guardar al lado del horno.",
        "Congelar y descongelar muchas veces."
      ]},
      {"type":"h2","text":"Tip práctico"},
      {"type":"p","text":"Si tu café viene en bolsa con válvula, cerrala bien y guardala dentro de un recipiente hermético."}
    ]
  }'::jsonb,
  true,
  20
);
