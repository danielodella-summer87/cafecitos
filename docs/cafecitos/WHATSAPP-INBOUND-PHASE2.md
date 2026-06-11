# WhatsApp inbound — Fase 2 (trazabilidad + lookup)

## Qué agrega

Migración: `supabase/migrations/20260611140000_whatsapp_inbound_phase2.sql`

- Columna `profiles.phone_normalized` (text, nullable)
- Índice `profiles_phone_normalized_consumer_idx` (solo `role = consumer`)
- Tabla `whatsapp_inbound_messages` con trazabilidad de cada POST a `/api/whatsapp/inbound`

## Qué NO hace

- No activa regalos de bienvenida
- No crea ni modifica `redeem_welcome_gift`
- No envía promociones
- No agrega opt-in WhatsApp

## Ejecución manual en Supabase

1. Abrir **Supabase Dashboard → SQL Editor**
2. Copiar el contenido de `20260611140000_whatsapp_inbound_phase2.sql`
3. Revisar y ejecutar **una sola vez**
4. Confirmar que Daniel aplicó la migración antes de depender de persistencia en producción

## Validación en Supabase

```sql
-- Columna
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone_normalized';

-- Tabla inbound
select count(*) from public.whatsapp_inbound_messages;

-- Índice consumer
select indexname from pg_indexes
where tablename = 'profiles' and indexname = 'profiles_phone_normalized_consumer_idx';
```

## Backfill `phone_normalized`

No incluido como SQL automático. Poblar desde:

- Script futuro que use `normalizeUyMobilePhone()` de `src/lib/phone/uy.ts`, o
- Bloque comentado al final de la migración (revisar antes de ejecutar)

Sin backfill, el lookup por teléfono devolverá `user_not_found` aunque `profiles.phone` exista.

## Webhook (fail-safe)

`POST /api/whatsapp/inbound` intenta persistir y hacer lookup **solo si** las tablas/columnas existen.

Si la migración no fue aplicada: responde TwiML igual que Fase 1 y loguea `persist_skipped`.

## Respuestas TwiML por caso (Fase 2)

| `action_taken` | Comportamiento |
|----------------|----------------|
| `invalid_phone` | No se validó el número WA |
| `user_not_found` | Teléfono válido, sin consumer coincidente |
| `ambiguous_phone` | Más de un consumer con el mismo `phone_normalized` |
| `already_redeemed` | Usuario encontrado, regalo ya activado |
| `welcome_gift_pending` | Usuario + intención de regalo, pendiente Fase 3 |
| `ignored_message` | Teléfono válido, mensaje no relacionado con regalo |

## Siguiente paso (Fase 3)

1. Backfill `phone_normalized` en consumers existentes
2. Nueva RPC `activate_welcome_gift_trusted(profile_id)` (sin código DDMM)
3. Webhook activa regalo solo con match único + `welcome_gift_pending`
4. Respuesta TwiML de confirmación con nombre del usuario

Ver también: `docs/cafecitos/WHATSAPP-MARKETING-KB.md`
