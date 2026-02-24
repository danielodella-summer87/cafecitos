# Map: campos de imagen actuales → `image_path` (media/<categoria>/<PREFIX>-###.<ext>)

## Comandos / búsquedas usados

```bash
# Supabase: columnas y referencias a imagen
grep -rn "image_code\|image_url\|image_path\|logo\|cover\|avatar\|photo\|banner\|hero_url\|icon" supabase/

# Actions: tipos y selects
grep -rn "image_code\|image_url\|image_path\|logo_url\|cover\|avatar\|hero_url" src/app/actions/

# UI: render de imágenes
grep -rn "image_code\|image_url\|image_path\|logo_url\|cover\|\.src=\|src={" src/app/app/

# Tipos y helpers de imagen
grep -rn "cover_url\|image_code\|image_url\|image_path\|logo\|cover" src/ --include="*.ts" --include="*.tsx"
```

---

## 1) Columnas/props relacionadas a imágenes (hallazgos reales)

### A) Tablas Supabase (migrations + snippets)

| Tabla / Vista | Columna(s) | Migración / Origen |
|---------------|------------|---------------------|
| **cafes** | `image_code` (text, formato `^[0-9]{2}$`) | 20260219120000, 20260220180000, 20260222113643 |
| **cafes** | `image_path` (text, NULL) | 20260324000000_add_image_path.sql (ya agregada) |
| **promotions** | `image_url` (text) | 20260303210000_create_promotions.sql |
| **promotions** | `image_path` (text, NULL) | 20260324000000_add_image_path.sql (ya agregada) |
| **cafe_promos** | `image_code` (text) | 20260220180000_cafe_hours_reviews_promos.sql |
| **v_cafe_promos_active** | `image_code` (hereda de cafe_promos) | Vista sobre cafe_promos |
| **coffee_guides** | `cover_url` (text) | 20260217000000_universo_cafe_pro.sql, 20260218000000, 20260217220000 |

No hay columnas de imagen en: **profiles**, **cafe_staff**, **settings_global**, **tiers** (solo badge_label, badge_message, dot_color; sin imagen).

### B) Types / interfaces / Zod (src)

| Archivo | Tipo / campo | Uso |
|---------|--------------|-----|
| ownerContext.ts | `OwnerContextCafe`: image_code, image_path?, image_url? | Contexto owner |
| ownerCafe.ts | `OwnerCafeRow`: image_code | getOwnerCafe |
| ownerCafe.ts | `OwnerPromoRow`: image_code | Promos por cafetería (cafe_promos) |
| cafes.ts | `CreateCafeInput` / `CafeListItem`: image_code | Admin cafés |
| cafeInfo.ts | `CafeRow` / `CafePublicInfo`: image_code | Modal info café |
| cafeInfo.ts | Promos: image_code (v_cafe_promos_active) | Promos en modal |
| adminPromotions.ts | Zod: image_url; tipo: image_url | Admin promos (tabla promotions) |
| consumerSummary.ts | `CafeMapItem`: image_code; promos: image_path?, image_url? | Resumen consumer |
| adminReports.ts | image_code en reportes / getCafeById | Reportes admin |
| coffeeGuides.ts | cover_url | Guías Universo Café |
| universoCafeCovers.ts / guideCovers.ts | cover_url en getGuideCover | Covers por slug |

### C) Actions (src/app/actions)

| Archivo | Select / uso |
|---------|---------------|
| consumerSummary.ts | cafes: `id, name, image_code`; promotions: `image_path, image_url` |
| ownerContext.ts | cafes: `image_code, image_path` |
| cafes.ts | `image_code` en create, update, list, getNextImageCode |
| cafeInfo.ts | cafe: `image_code`; v_cafe_promos_active: `promo_id, title, description, image_code` |
| ownerCafe.ts | cafe: `image_code`; cafe_promos: `image_code` |
| adminPromotions.ts | promotions: `image_url` (CRUD) |
| adminReports.ts | vistas/reportes: `image_code`; getCafeById: `image_code` |
| coffeeGuides.ts | `cover_url` |

### D) UI que renderiza imágenes (src/app/app + ui)

| Archivo | Qué renderiza | Origen del valor |
|---------|----------------|------------------|
| OwnerPanelClient.tsx | Imagen de cafetería (myCafe) | resolvePublicImage(image_path ?? image_url) ?? default |
| app/owner/page.tsx | Pasa image_path, image_url a cliente | ctx.cafe |
| ConsumerPanelClient.tsx | CafeCard por cada café; banners estáticos | resolvePublicImage(cafe.image_path ?? image_url); banners: /images/banners/*.png |
| CafeInfoModal.tsx | Imagen del café en modal | resolvePublicImage(c.image_path ?? image_url ?? hero_url) |
| CafeListClient.tsx (admin) | Imagen en lista de cafés | resolvePublicImage(cafe.image_path ?? image_url) ?? COVER_DEFAULT |
| AdminPanelClient.tsx | Promo: solo texto image_url en formulario/vista (no <img>) | promoForm.image_url, promoToView.image_url |
| admin/cafes/[id]/edit, EditCafeClient, CafeForm | Formulario image_code (código 01..99) | cafe.image_code |
| universo-cafe/GuideContent.tsx, CoffeeGuideCard.tsx | Cover de guía | getGuideCover({ cover_url, slug, title }) |
| universo-cafe/UniversoCafeClient.tsx | Logo | /logoamoaperfecto.png, /universo-cafe/logoamoaperfecto.png |
| login/page.tsx, register/page.tsx, welcome/WelcomeClient.tsx | Logo | /logoamorperfecto.png |
| components/brand/AppMark.tsx | Logo app | /logocafecito2026.png |

### E) Seeds / scripts

- **20260217220000_upgrade_coffee_guides_content_premium.sql**: actualiza `cover_url` de coffee_guides con rutas `/universo-cafe/...`.
- **20260217100000_seed_coffee_guides.sql**: inserta con `cover_url`.
- No hay seeds de cafes/promotions con imágenes en el repo revisado.

### F) Assets estáticos (no en DB)

- `/media/cover-default.jpg` — fallback cafés.
- `/media/cafes/XX.jpg` — construido en código desde `image_code` (padStart 2).
- `/images/banners/cafeterias-wide.png`, `default-wide.png`, `universo-cafe-wide.png`, `eventos-wide.png`, `canjeado-wide.png`, `movimientos-wide.png`.
- `/logoamorperfecto.png`, `/logocafecito2026.png`, `/logoamoaperfecto.png`, `/universo-cafe/logoamoaperfecto.png`.
- `/universo-cafe/*.png` — covers de guías (mapeo por slug en guideCovers/universoCafeCovers).

---

## 2) Por entidad: tabla, campos, uso, prioridad, tipo de valor

### Entidad: **cafes**

| Campo | Tipo / constraint | Dónde se usa | Prioridad actual | Valor |
|-------|-------------------|--------------|-------------------|--------|
| image_code | text, `^[0-9]{2}$`, unique | ownerContext, cafes.ts, cafeInfo, ownerCafe, adminReports, CafeForm, EditCafeClient, OwnerPanelClient (título "01 - Nombre"), CafeName, media.tsx CafeLike | Alta (único hasta ahora) | Código corto "01".."99"; en UI se arma `/media/cafes/01.jpg` |
| image_path | text NULL | ownerContext (select), OwnerPanelClient, CafeListClient, ConsumerPanelClient, CafeInfoModal | Alta cuando existe | Path completo esperado: media/cafes/C-001.png |
| image_url | no en tabla cafes | Solo en tipos TS/UI como fallback opcional | Baja | N/A en DB |

**Render actual:** `resolvePublicImage(myCafe?.image_path ?? myCafe?.image_url ?? null) ?? "/media/cover-default.jpg"`. Si no hay image_path, no se construye ya desde image_code en ese helper (queda default o legacy en otros lados).

---

### Entidad: **promotions** (admin, tabla global)

| Campo | Tipo | Dónde se usa | Prioridad actual | Valor |
|-------|------|--------------|-------------------|--------|
| image_url | text | adminPromotions (Zod, select, insert, update), consumerSummary (select + resolvePublicImage), AdminPanelClient (form/vista texto) | Alta | URL absoluta o path; default en consumerSummary: Unsplash |
| image_path | text NULL | 20260324000000; consumerSummary (select + resolvePublicImage) | Alta cuando existe | media/promos/P-001.webp |

**Render actual:** consumerSummary pasa `resolvePublicImage(p.image_path ?? p.image_url ?? null) ?? DEFAULT_IMAGE` a PromoCard (image prop).

---

### Entidad: **cafe_promos** (promos por cafetería, owner)

| Campo | Tipo | Dónde se usa | Prioridad actual | Valor |
|-------|------|--------------|-------------------|--------|
| image_code | text | 20260220180000; v_cafe_promos_active; cafeInfo (promos del modal); ownerCafe (listOwnerPromos) | Única | Código; no se ve render de imagen de promo en modal (solo título/descripción) |

**Nota:** Vista `v_cafe_promos_active` expone `image_code`. No hay imagen de promo por café renderizada en UI en los archivos revisados; solo se usa en datos.

---

### Entidad: **coffee_guides**

| Campo | Tipo | Dónde se usa | Prioridad actual | Valor |
|-------|------|--------------|-------------------|--------|
| cover_url | text | coffeeGuides.ts (select), universoCafeCovers.getGuideCover, guideCovers, GuideContent, CoffeeGuideCard, migrations (UPDATE con /universo-cafe/...) | Única | Ruta relativa tipo `/universo-cafe/nombre.png` o sin leading slash |

**Render actual:** `getGuideCover({ cover_url: guide.cover_url, slug, title })` → cover_url || COVER_BY_SLUG[slug] || GENERIC_COVER.

---

### Entidad: **profiles / cafe_staff / settings_global / tiers**

- **profiles**: no hay columna de imagen en migrations.
- **cafe_staff**: no hay columna de imagen.
- **settings_global**: no hay columna de imagen.
- **tiers**: solo badge_label, badge_message, dot_color (texto/color); sin campo de imagen.

---

## 3) Output final

### A) Cuadro MAP

| Entidad | Campos actuales | Campo futuro | Carpeta | Prefijo sugerido |
|---------|-----------------|--------------|---------|-------------------|
| **cafes** | image_code, image_path (ya existe) | image_path | media/cafes | C- |
| **promotions** | image_url, image_path (ya existe) | image_path | media/promos | P- |
| **cafe_promos** | image_code | image_path (añadir columna) | media/promos | P- (o O- si se quieren “promos owner”) |
| **coffee_guides** | cover_url | image_path (opcional; o mantener cover_url y normalizar valor) | media/guides o universo-cafe | G- o mantener /universo-cafe/ |
| **logos/estáticos** | — | N/A (no en DB) | media/logos | L- (si se migraran a DB) |
| **tiers** | (sin imagen) | — | — | — |

Resumen corto:

- **cafes**: image_code + image_path → **image_path** → media/cafes → **C-**
- **promotions**: image_url + image_path → **image_path** → media/promos → **P-**
- **cafe_promos**: image_code → **image_path** (nuevo) → media/promos → **P-** (o **O-**)
- **coffee_guides**: cover_url → **image_path** opcional o seguir con cover_url normalizado → media/guides o universo-cafe

---

### B) TODOs para compatibilidad

1. **Fallbacks temporales**
   - **cafes:** Mantener lectura de `image_code` en:
     - Formularios admin (CafeForm, EditCafeClient, edit page) para no romper alta/edición mientras se migra.
     - CafeName y títulos tipo "01 - Nombre" (no es src de imagen).
     - getNextImageCode / createCafe / updateCafe hasta que la UI pase a subir/image_path.
   - **promotions:** Mantener `image_url` en admin (form y payload) hasta que el admin use solo image_path.
   - **cafe_promos:** Si se agrega image_path, mantener image_code como fallback opcional hasta migración de datos.
   - **coffee_guides:** Mantener cover_url; si se agrega image_path, usar image_path ?? cover_url en getGuideCover.

2. **Migración SQL para copiar valores existentes a image_path**
   - **cafes:**  
     - Si image_code está poblado y se quiere generar path:  
       `UPDATE public.cafes SET image_path = 'media/cafes/C-' || lpad(image_code, 3, '0') || '.png' WHERE image_code IS NOT NULL AND image_path IS NULL;`  
     - Ajustar extensión (.jpg/.png) según archivos reales en /public/media/cafes/.
   - **promotions:**  
     - Si image_url tiene rutas relativas o paths que sigan la convención:  
       `UPDATE public.promotions SET image_path = CASE WHEN image_url LIKE 'media/%' THEN image_url WHEN image_url LIKE '/%' AND image_url NOT LIKE 'http%' THEN ltrim(image_url, '/') ELSE NULL END WHERE image_path IS NULL AND image_url IS NOT NULL;`  
     - Si son solo URLs absolutas (ej. Unsplash), no copiar o mapear a un path solo si tenés copia local.
   - **cafe_promos:**  
     - Añadir columna: `ALTER TABLE public.cafe_promos ADD COLUMN IF NOT EXISTS image_path text;`  
     - Si se decide migrar desde image_code (ej. numérico): mismo patrón que cafes con prefijo P- u O-.
   - **coffee_guides:**  
     - Opcional: `ALTER TABLE public.coffee_guides ADD COLUMN IF NOT EXISTS image_path text;`  
     - `UPDATE public.coffee_guides SET image_path = trim(both '/' from cover_url) WHERE cover_url IS NOT NULL AND image_path IS NULL;` (normalizar a path sin leading slash).

3. **Helpers de frontend y archivos a tocar**
   - **resolvePublicImage** (src/lib/media.ts): ya existe; seguir usándolo para todo src de imagen (image_path ?? image_url ?? …).
   - **OwnerPanelClient.tsx:** Ya usa resolvePublicImage(image_path ?? image_url); mantener; cuando no haya image_path, seguir mostrando default (no construir desde image_code en este componente si se quiere eliminar esa lógica).
   - **ConsumerPanelClient.tsx:** Idem; cadena image_path ?? image_url ya usada.
   - **CafeInfoModal.tsx:** Idem; image_path ?? image_url ?? hero_url.
   - **CafeListClient.tsx:** Idem; image_path ?? image_url.
   - **consumerSummary.ts:** Ya usa image_path ?? image_url para promos; mantener y seguir priorizando image_path.
   - **admin/cafes:** En create/update, añadir soporte para guardar image_path (y opcionalmente seguir aceptando image_code como fallback); en list/detail, leer image_path.
   - **admin promotions:** Añadir campo image_path en form y en adminPromotions (select/insert/update); mostrar/prellenar image_path; mantener image_url como fallback temporal si se desea.
   - **cafeInfo.ts:** Si cafe_promos pasa a tener image_path, seleccionarlo en v_cafe_promos_active (o en query a cafe_promos) y exponerlo en el tipo; en UI del modal de café, si se muestra imagen de promo, usar resolvePublicImage(promo.image_path ?? promo.image_code).
   - **ownerCafe.ts:** Si cafe_promos tiene image_path, añadir a select y a OwnerPromoRow; en UI owner que muestre imagen de promo, usar resolvePublicImage.
   - **coffee_guides:** Si se agrega image_path en DB, en coffeeGuides.ts incluir image_path en select; en getGuideCover (universoCafeCovers/guideCovers) usar image_path ?? cover_url para compatibilidad.

---

## 4) Resumen de hallazgos principales (grep)

- **cafes:** image_code en migrations (único, formato 01..99), image_path ya añadida; en UI se usa resolvePublicImage(image_path ?? image_url); en admin se sigue usando image_code en formularios.
- **promotions:** image_url en tabla; image_path ya añadida; consumerSummary y AdminPanelClient usan image_url; consumerSummary ya prioriza image_path cuando existe.
- **cafe_promos:** solo image_code; vista v_cafe_promos_active; usado en cafeInfo (modal) y ownerCafe (listado); no hay render de imagen de promo por café en el código revisado.
- **coffee_guides:** cover_url; rutas /universo-cafe/...; getGuideCover con fallback por slug.
- **Assets estáticos:** /media/cover-default.jpg, /media/cafes/XX.jpg (armado con image_code), /images/banners/*.png, /logo*.png, /universo-cafe/*.png.
- **tiers/profiles/settings_global:** sin columnas de imagen.
