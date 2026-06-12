# WhatsApp inbound · Causa raíz `PGRST205` y alineación Supabase

> Diagnóstico cerrado. **Solo documentación.** No aplicar cambios desde este archivo.

---

## ✅ CIERRE VALIDADO — Fase 2 inbound (2026-06-12)

El fix descrito en este documento **se aplicó y se validó end-to-end** contra el
Supabase canónico **cafecitos** (`mleloxbpvkfdtnnpoeyr`). Resumen:

- Vercel (`cafecitos.shop`) ya apunta al Supabase **correcto** (`mleloxbpvkfdtnnpoeyr`).
- `NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER` apunta al **sandbox de Twilio**.
- El webhook **persiste** en `whatsapp_inbound_messages` (ya no `PGRST205`).
- El lookup por `profiles.phone_normalized` **funciona**.
- Ningún regalo se activó automáticamente (Fase 3 sigue pendiente, por diseño).

Secuencia de prueba observada:

| Evento | `action_taken` | Notas |
|--------|----------------|-------|
| 1er mensaje | `ignored_message` | mensaje no era solicitud de regalo |
| 2do mensaje | `user_not_found` | teléfono aún sin `phone_normalized` que matchee |
| 3er mensaje (tras corregir `phone_normalized` del perfil de prueba 7) | `welcome_gift_pending` | `matched_user_id = df93c902-78a3-4a46-b7de-a52ae7d0ed69`, `status = processed` |

**Detalle completo del cierre:** ver `docs/cafecitos/WHATSAPP-INBOUND-PHASE2-CIERRE.md`.

El resto de este documento queda como **registro histórico** del diagnóstico y de los
pasos manuales que llevaron a este cierre.

## Decisión final (confirmada por Daniel)

| Proyecto | Ref | Rol |
|----------|-----|-----|
| **cafecitos** | `mleloxbpvkfdtnnpoeyr` | **Canónico de producción** — usuarios reales, migración Fase 2 aplicada aquí |
| cafecitos-prod | `lxiwhuzdzxmgvnoaswzv` | Proyecto nuevo, pocos clientes — **NO** usar como producción |

**Acción:** repuntar Vercel (`cafecitos.shop`) al proyecto **cafecitos** (`mleloxbpvkfdtnnpoeyr`).

**NO** ejecutar migración Fase 2 en `lxiwhuzdzxmgvnoaswzv`.

---

## Síntoma

Vercel Logs muestra, en cada mensaje entrante:

```
Could not find the table 'public.whatsapp_inbound_messages' in the schema cache
```

(código PostgREST `PGRST205`). El webhook responde TwiML por WhatsApp, pero **no persiste**
el mensaje (`persistOk: false`, `actionTaken: persist_skipped` o error de persistencia).

## Causa raíz

- **Vercel** (producción `cafecitos.shop`) apunta hoy a **cafecitos-prod**
  (`lxiwhuzdzxmgvnoaswzv`) vía `NEXT_PUBLIC_SUPABASE_URL`.
- La **migración Fase 2** (`profiles.phone_normalized` + `whatsapp_inbound_messages`) se
  ejecutó en el proyecto **original cafecitos** (`mleloxbpvkfdtnnpoeyr`).
- El webhook busca `public.whatsapp_inbound_messages` en el proyecto que usa Vercel
  (`lxiwhuzdzxmgvnoaswzv`), pero esa tabla **solo existe** en `mleloxbpvkfdtnnpoeyr`.
- Login y dashboard “funcionan” en Vercel porque apuntan al proyecto equivocado con
  **pocos** usuarios de prueba, no al universo real de clientes.

### Detalle técnico

Toda la app usa **un solo** par URL + keys (`src/lib/supabase/admin.ts`,
`src/lib/supabase/client.ts`). No hay cliente separado para webhook vs dashboard.
Corregir las env vars en Vercel alinea **toda** la app al Supabase canónico.

---

## Impacto sobre WhatsApp / Twilio (auditoría)

Repuntar Supabase en Vercel **no rompe** el flujo WhatsApp si solo se cambian las 3
variables Supabase. Resumen por componente:

| Componente | ¿Depende de Supabase? | ¿Cambiar al repuntar? |
|------------|----------------------|------------------------|
| `TWILIO_WEBHOOK_AUTH_TOKEN` | **No** — solo `process.env` en `route.ts` | **No tocar** |
| URL webhook Twilio (`cafecitos.shop/api/whatsapp/inbound?token=...`) | **No** — dominio + ruta fijos | **No tocar Twilio Console** |
| `NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER` | **No** — solo `wa.me` outbound (`cafecitosWhatsApp.ts`) | **No tocar** |
| Botón “Solicitar regalo por WhatsApp” | Solo usa `wa.me` + número público | **Sigue igual** |
| Twilio Sandbox → POST inbound | Twilio → Vercel; auth por `?token=` | **Sigue igual** |
| Respuesta TwiML automática | Código en `route.ts` + `twiml.ts` | **Sigue igual** (mejora persistencia) |
| `POST /api/whatsapp/inbound` | Auth Twilio **independiente**; persist/lookup **sí** usan Supabase | **Sigue funcionando**; debería **persistir** tras el fix |
| `whatsapp_inbound_messages` | Tabla en Supabase canónico | Debe existir en `mleloxbpvkfdtnnpoeyr` (validar SQL abajo) |
| `profiles.phone_normalized` | Lookup en `inboundPhase2.ts` | Debe existir en canónico; backfill pendiente para match |

### Preguntas frecuentes

**¿`TWILIO_WEBHOOK_AUTH_TOKEN` depende del proyecto Supabase?**  
No. Es variable de Vercel independiente. Twilio la envía como `?token=` en la URL del
webhook; el endpoint la compara con `timingSafeEqual`. No cambia al repuntar Supabase.

**¿`NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER` depende de Supabase?**  
No. Solo construye links `https://wa.me/{número}?text=...` en dashboard y bienvenida.

**¿Hay que cambiar la URL del webhook en Twilio?**  
No, si sigue siendo `https://cafecitos.shop/api/whatsapp/inbound?token=...`. El dominio
no cambia; solo cambia a qué Supabase escribe el backend tras recibir el POST.

**¿Hay que hacer `NOTIFY pgrst, 'reload schema'`?**  
No por el cambio de env vars en Vercel. Eso aplica si creás tablas **en el mismo**
proyecto y PostgREST no las ve; acá el canónico ya tiene Fase 2 aplicada. Solo
redeploy Vercel.

**¿Hay que redeployar Vercel?**  
**Sí, obligatorio.** `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` se
embeben en build time.

**¿Hay que tocar Twilio Console?**  
**No**, salvo que el webhook dejara de responder (no es el caso esperado).

### Validar tablas en canónico (antes o después del redeploy)

En SQL Editor de **cafecitos** (`mleloxbpvkfdtnnpoeyr`):

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name = 'phone_normalized';

select exists (
  select 1 from information_schema.tables
  where table_schema = 'public'
    and table_name = 'whatsapp_inbound_messages'
) as has_inbound_table;
```

Ambos deben ser positivos si Fase 2 ya se aplicó en canónico.

---

## Variables Vercel a corregir

Las **tres** deben salir del mismo proyecto Supabase: **cafecitos** (`mleloxbpvkfdtnnpoeyr`).

| Variable | Debe apuntar a |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mleloxbpvkfdtnnpoeyr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key de **cafecitos** |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de **cafecitos** |

**No mezclar** keys de un proyecto con URL de otro.

---

## Pasos manuales para Daniel (Vercel)

### 1. Obtener credenciales del Supabase canónico

1. Ir a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Abrir proyecto **cafecitos** (ref `mleloxbpvkfdtnnpoeyr`)
3. **Project Settings** → **API**
4. Copiar (sin pegar en chats públicos):
   - **Project URL** → valor para `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Validar que las 3 pertenecen al mismo proyecto

Antes de guardar en Vercel, comprobar:

- La URL contiene **`mleloxbpvkfdtnnpoeyr`** en el host:
  `https://mleloxbpvkfdtnnpoeyr.supabase.co`
- Las keys se copiaron **desde la misma pantalla API** del mismo proyecto (no de
  cafecitos-prod / `lxiwhuzdzxmgvnoaswzv`).

Opcional en SQL Editor de **cafecitos** (`mleloxbpvkfdtnnpoeyr`):

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'whatsapp_inbound_messages')
order by table_name;
```

Debe listar ambas tablas (Fase 2 ya aplicada en canónico).

### 3. Editar variables en Vercel

1. [https://vercel.com](https://vercel.com) → proyecto de **Cafecitos** (el que sirve `cafecitos.shop`)
2. **Settings** → **Environment Variables**
3. Editar (o crear si faltan) para **Production** (y Preview si usás previews con prod data):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Pegar los valores del paso 1 (proyecto **mleloxbpvkfdtnnpoeyr**)
5. **Save**

No tocar otras variables (`TWILIO_*`, `SESSION_SECRET`, `NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER`, etc.) salvo que sepas que también estaban mal.

### 4. Redeploy

1. **Deployments** → último deployment de `main` / producción
2. **⋯** → **Redeploy**
3. Confirmar redeploy (las `NEXT_PUBLIC_*` se embeben en build time; el service role se lee en runtime)

Alternativa: push vacío o redeploy desde CLI — lo importante es un **nuevo deployment** tras cambiar env vars.

---

## Validaciones críticas después del redeploy

### A. Login

- Ir a `https://cafecitos.shop/login`
- Iniciar sesión con un usuario **real** del proyecto original (cédula conocida)
- Si falla: las keys no coinciden con el proyecto canónico o el usuario no existe ahí

### B. Dashboard

- Entrar a `/app/consumer` (o panel según rol)
- Ver saldo, movimientos y datos coherentes con usuarios reales

### C. Botón WhatsApp (outbound)

- En dashboard o bienvenida, tocar **“Solicitar regalo por WhatsApp”**
- Debe abrir `wa.me` con mensaje prearmado (sin cambios esperados)

### D. Webhook WhatsApp (inbound)

- Enviar mensaje de prueba al Twilio Sandbox desde el celular de prueba
- Twilio debe seguir respondiendo TwiML automático (no debe romperse)

### E. Persistencia inbound

En SQL Editor de **cafecitos** (`mleloxbpvkfdtnnpoeyr`):

```sql
select action_taken, whatsapp_from_normalized, matched_user_id, created_at
from public.whatsapp_inbound_messages
order by created_at desc
limit 5;
```

Tras el fix, debería aparecer una fila nueva por cada mensaje de prueba (ya no solo
`PGRST205` en logs).

### F. Logs Vercel

En el deployment nuevo, buscar log del webhook (`twilio_whatsapp_inbound`):

- `supabaseProjectRef` debe ser **`mleloxbpvkfdtnnpoeyr`**
- `persistOk: true` (cuando la tabla existe y el insert funciona)
- `actionTaken` distinto de `persist_skipped` cuando corresponda lookup/persistencia

Si sigue `lxiwhuzdzxmgvnoaswzv`: redeploy incompleto o variables no guardadas en Production.

---

## Qué hacer con cafecitos-prod (`lxiwhuzdzxmgvnoaswzv`)

| Acción | Recomendación |
|--------|----------------|
| Borrar proyecto | **No** — riesgo irreversible |
| Ejecutar migración Fase 2 ahí | **No** — no es canónico |
| Dejarlo quieto | **Sí** — mínimo riesgo |
| Renombrar en dashboard | **Opcional** — ej. `cafecitos-prod-DEPRECATED-no-usar` |
| Documentar internamente | **Sí** — “solo pruebas / no producción” |
| Rotar keys si quedaron expuestas | Solo si hubo filtración; no es parte de este fix |

No tomar acciones destructivas hasta que producción esté estable en canónico varios días.

---

## Qué NO tocar en esta corrección

- DNS / dominio `cafecitos.shop`
- Twilio Sandbox webhook URL y `TWILIO_WEBHOOK_AUTH_TOKEN`
- `NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER`
- Twilio Console (salvo emergencia)
- Código de la app (sin cambios funcionales para este fix)
- Migración Fase 2 en **cafecitos-prod** (`lxiwhuzdzxmgvnoaswzv`)
- Activación automática de regalos (Fase 3)
- `.env.local` local (actualizar aparte si desarrollo local debe usar canónico)

---

## Después de alinear Vercel

1. Backfill `profiles.phone_normalized` en **cafecitos** (`mleloxbpvkfdtnnpoeyr`) si aún no se hizo — ver `docs/cafecitos/WHATSAPP-INBOUND-PHASE2.md`
2. Probar lookup: mensaje de regalo desde teléfono registrado → `welcome_gift_pending` o `user_not_found` según backfill
3. Fase 3: RPC `activate_welcome_gift_trusted` (futuro, con SQL manual)

---

## Referencias

- Fase 2 webhook: `docs/cafecitos/WHATSAPP-INBOUND-PHASE2.md`
- KB general: `docs/cafecitos/WHATSAPP-MARKETING-KB.md`
- Migración (ya aplicada en canónico): `supabase/migrations/20260611140000_whatsapp_inbound_phase2.sql`
