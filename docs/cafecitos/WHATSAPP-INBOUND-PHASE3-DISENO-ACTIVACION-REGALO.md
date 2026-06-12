# WhatsApp inbound · Fase 3 — Diseño de activación automática del regalo de bienvenida

> **Solo diseño + SQL manual preparado.** Nada se ejecutó. No se activó ningún regalo,
> no se corrió SQL, no se modificó código funcional, no se tocó Twilio/Vercel/variables.
> El SQL queda en un archivo marcado **EJECUTAR MANUALMENTE**.

- **Fecha:** 2026-06-12
- **Supabase canónico:** cafecitos / `mleloxbpvkfdtnnpoeyr`
- **Base:** Fase 2 cerrada (commit `cb25e2f`). Evidencia: `action_taken=welcome_gift_pending`,
  `status=processed`, `matched_user_id=df93c902-78a3-4a46-b7de-a52ae7d0ed69`.
- **SQL propuesto:** `docs/cafecitos/sql/WHATSAPP-PHASE3-activate-welcome-gift-trusted.manual.sql`

---

## A. Diagnóstico del flujo actual

### A.1 Regalo de bienvenida hoy (ruta app, por código DDMM)

- **RPC `public.redeem_welcome_gift(p_profile_id uuid, p_code text)`**
  (`supabase/migrations/20260213180000_welcome_gift_and_rpc.sql`):
  - Calcula el código esperado = `DDMM` de `profiles.created_at` en TZ `America/Montevideo`.
  - Si el código no coincide → `{ok:false, 'Código incorrecto'}`.
  - **Idempotencia:** si `welcome_gifts.redeemed_at is not null` → `{ok:false, 'El regalo ya fue activado'}`.
  - Inserta `point_transactions` (`tx_type='earn'`, `to_profile_id=p_profile_id`, `amount=10`, note `'Regalo de bienvenida'`).
  - Upsert en `welcome_gifts` con `redeemed_at = now()` (`on conflict do update`).
  - `security definer`; `grant execute` a `service_role` **y** `authenticated`.
- **Caller:** `src/app/actions/consumerSummary.ts:151` `redeemWelcomeGift(code)` — server action que
  valida sesión (`consumer`/`staff`), normaliza el código a 4 dígitos y llama la RPC con `supabaseAdmin()`.

### A.2 Cómo se acreditan puntos (clave para Fase 3)

- `wallets.balance` **no se escribe a mano**: lo mantiene el trigger
  `trg_apply_point_transaction` (`AFTER INSERT on point_transactions`,
  `supabase/migrations/20260213175005_init_cafecitos_schema.sql:70-131`). Un `earn`
  hacia `to_profile_id` suma `amount` al balance y a `lifetime_earned`, creando la
  wallet si no existe.
- Existe `trg_prevent_negative_balance` (`BEFORE INSERT`) que solo aplica a salidas
  (`from_profile_id`); un `earn` no lo dispara.
- **Consecuencia:** insertar la transacción `earn` dentro de una RPC ya acredita el
  saldo atómicamente (trigger en la misma transacción). No hace falta tocar `wallets`.

### A.3 Webhook inbound hoy (Fase 2)

- `src/app/api/whatsapp/inbound/route.ts`: valida token (`?token=` vs
  `TWILIO_WEBHOOK_AUTH_TOKEN`, `timingSafeEqual`), parsea el form de Twilio, llama
  `processInboundMessagePhase2(...)`, loguea, y responde TwiML con `twimlReplyForAction(...)`.
- `src/lib/whatsapp/inboundPhase2.ts`:
  - `InboundActionTaken` = 8 valores (los mismos del CHECK de la tabla).
  - `processInboundMessagePhase2`: normaliza teléfono (`normalizeUyMobilePhone`),
    detecta intención (`isWelcomeGiftIntent`), hace lookup `profiles` por
    `phone_normalized` + `role='consumer'`.
  - **Punto de integración Fase 3** — rama de match único con intención de regalo
    (`inboundPhase2.ts:213-221`):
    ```ts
    matchedUserId = lookup.profiles[0].id;
    matchedUserName = lookup.profiles[0].full_name;
    try {
      const redeemed = await isWelcomeGiftRedeemed(matchedUserId);
      actionTaken = redeemed ? "already_redeemed" : "welcome_gift_pending";  // <-- AQUÍ
    } catch {
      actionTaken = "error";
    }
    ```
    Hoy decide `welcome_gift_pending` (no activa). Aquí se engancha la llamada a la RPC.
  - Persiste en `whatsapp_inbound_messages` (insert con `action_taken`; `23505`/duplicado
    se trata como ok; errores de schema → `persist_skipped`).

### A.4 Restricción de datos a considerar

- `whatsapp_inbound_messages.action_taken` tiene un **CHECK** que solo admite los 8
  valores de Fase 2 (`...phase2.sql:33-44`). Persistir nuevos `action_taken` exige
  **ampliar ese CHECK primero** (SQL manual). Si no, el insert falla.

---

## B. Riesgos de activar el regalo automáticamente

| # | Riesgo | Mitigación en el diseño |
|---|--------|--------------------------|
| 1 | **Doble acreditación** (mensajes repetidos / reintentos Twilio) | Claim atómico con `UPDATE ... WHERE redeemed_at IS NULL` + lock de fila; segunda llamada → `already_redeemed` |
| 2 | **Activar a quien no corresponde** (teléfono ajeno) | Solo si hay match **único** por `phone_normalized` + `role='consumer'`; nunca con `user_not_found`/`ambiguous_phone` |
| 3 | **Activar sin pedido real** (texto suelto) | Requiere `isWelcomeGiftIntent(body)`; sin intención no se activa |
| 4 | **Exponer una vía sin código** a clientes autenticados | La RPC nueva se concede **solo a `service_role`** (no `authenticated`) |
| 5 | **Inconsistencia parcial** (puntos sin marcar / marcado sin puntos) | Todo en una sola transacción RPC: si falla el insert, revierte el claim |
| 6 | **Romper Fase 2 al desplegar** | Feature flag `WHATSAPP_AUTO_REDEEM_WELCOME_GIFT`, default `false`; con flag off el comportamiento es idéntico al actual |
| 7 | **Persistir un `action_taken` no permitido** | Ampliar el CHECK ANTES de activar la flag (paso 1 del SQL) |
| 8 | **Reintento de Twilio sobre el mismo SID** | Índice único `provider_message_id`; además la idempotencia del regalo es a nivel de negocio (no depende del SID) |

---

## C. Recomendación técnica: nueva RPC `activate_welcome_gift_trusted`

**Opción elegida: B — crear una RPC server-only nueva.** Descartadas:

- **A (reutilizar `redeem_welcome_gift` con el código calculado server-side):** habría que
  reconstruir el `DDMM` desde `created_at` dentro del webhook para “auto-pasar” el código.
  Eso **vacía de sentido** la verificación por código y duplica lógica frágil de TZ. ❌
- **C (función SQL ad-hoc embebida en el webhook / SQL suelto):** menos trazable, sin
  control de permisos claro. ❌
- **D (no activar, dejar solo propuesta):** es el estado actual; el objetivo es habilitar
  la activación de forma segura. Se mantiene como fallback vía la flag en `false`. ⚠️

**Por qué B:**

- **Modelo de confianza explícito y distinto al de la app.** La app usa “sabés tu código
  DDMM”. WhatsApp usa “escribís desde tu `phone_normalized` registrado” (lo verifica el
  webhook). Son dos pruebas de posesión diferentes; conviene una función por cada una.
- **No debilita la ruta existente.** `redeem_welcome_gift` queda intacta (código DDMM,
  grant a `authenticated`).
- **Permiso más estricto.** La nueva función se concede **solo a `service_role`**.
- **Misma mecánica de acreditación** (earn +10 → trigger actualiza wallet), idempotente y
  atómica.

Detalle de la RPC (ver SQL completo en el archivo de migración):

- Firma: `activate_welcome_gift_trusted(p_profile_id uuid) returns jsonb`.
- Verifica perfil existente y `role='consumer'`.
- `insert ... on conflict do nothing` para garantizar la fila, luego
  `update ... set redeemed_at=now() where redeemed_at is null returning ...` (claim atómico).
- Si no hubo claim → `{ok:false, status:'already_redeemed'}`.
- Si hubo claim → inserta `earn +10` y devuelve `{ok:true, status:'redeemed', credited:10}`.

---

## D. SQL manual propuesto (NO ejecutado)

Archivo: **`docs/cafecitos/sql/WHATSAPP-PHASE3-activate-welcome-gift-trusted.manual.sql`**
(creado, marcado “EJECUTAR MANUALMENTE”, **no** corrido).

Contiene, en orden:

1. **Paso 0** — validaciones read-only previas (existencia de función, definición del CHECK).
2. **Paso 1** — `drop`/`add` del CHECK `whatsapp_inbound_messages_action_taken_chk` para
   admitir `welcome_gift_redeemed`, `welcome_gift_already_redeemed`, `welcome_gift_redeem_failed`.
3. **Paso 2** — `create or replace function activate_welcome_gift_trusted(uuid)` +
   `revoke ... from public` + `grant execute ... to service_role`.
4. **Paso 3** — validaciones read-only posteriores.
5. **Rollback lógico** (comentado, solo entorno test) para re-probar idempotencia.

**Protección contra doble canje:** el claim es un `UPDATE` condicional sobre
`redeemed_at is null`, que toma lock de fila; cualquier segundo intento concurrente o
posterior obtiene 0 filas → `already_redeemed`. Atómico con el insert del `earn`.

---

## E. Cambios de código mínimos propuestos (NO aplicados)

> Pendientes de tu confirmación. **No** los apliqué. Requieren que el Paso 1 del SQL
> (ampliar el CHECK) ya esté corrido, o el insert de persistencia fallaría.

### E.1 `src/lib/whatsapp/inboundPhase2.ts`

**(1) Ampliar el union de acciones:**
```ts
export type InboundActionTaken =
  | "invalid_phone"
  | "user_not_found"
  | "ambiguous_phone"
  | "already_redeemed"
  | "welcome_gift_pending"
  | "ignored_message"
  | "persist_skipped"
  | "error"
  // Fase 3:
  | "welcome_gift_redeemed"
  | "welcome_gift_already_redeemed"
  | "welcome_gift_redeem_failed";
```

**(2) Flag + helper de activación (server-only):**
```ts
const AUTO_REDEEM_WELCOME_GIFT =
  process.env.WHATSAPP_AUTO_REDEEM_WELCOME_GIFT === "true";

async function activateWelcomeGiftTrusted(
  profileId: string
): Promise<"welcome_gift_redeemed" | "welcome_gift_already_redeemed" | "welcome_gift_redeem_failed"> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.rpc("activate_welcome_gift_trusted", {
    p_profile_id: profileId,
  });
  if (error) return "welcome_gift_redeem_failed";
  const status = (data as { status?: string } | null)?.status;
  if (status === "redeemed") return "welcome_gift_redeemed";
  if (status === "already_redeemed") return "welcome_gift_already_redeemed";
  return "welcome_gift_redeem_failed";
}
```

**(3) Enganche en la rama de match único (reemplaza el bloque `inboundPhase2.ts:216-221`):**
```ts
try {
  const redeemed = await isWelcomeGiftRedeemed(matchedUserId);
  if (redeemed) {
    actionTaken = "already_redeemed";
  } else if (AUTO_REDEEM_WELCOME_GIFT) {
    actionTaken = await activateWelcomeGiftTrusted(matchedUserId); // Fase 3 ON
  } else {
    actionTaken = "welcome_gift_pending";                          // Fase 3 OFF (default)
  }
} catch {
  actionTaken = "error";
}
```

**(4) TwiML para los nuevos estados (en `twimlReplyForAction`):**
```ts
case "welcome_gift_redeemed":
  return matchedUserName?.trim()
    ? `¡Listo ${matchedUserName.trim()}! Activamos tu regalo de bienvenida 🎁 Tenés 10 cafecitos en tu cuenta.`
    : "¡Listo! Activamos tu regalo de bienvenida 🎁 Tenés 10 cafecitos en tu cuenta.";
case "welcome_gift_already_redeemed":
  return TWIML_ALREADY_REDEEMED;
case "welcome_gift_redeem_failed":
  return "Recibimos tu solicitud ✅ Tuvimos un problema al activar el regalo; lo revisamos y te confirmamos en breve.";
```

### E.2 Nada que cambiar en `route.ts`

El webhook ya propaga `actionTaken` a logs, persistencia y TwiML. Los nuevos valores
fluyen sin tocar `route.ts`.

### E.3 Orden de despliegue seguro

1. Correr el SQL manual (Paso 1 + Paso 2).
2. Mergear el código con la flag **ausente/false** (comportamiento idéntico a hoy).
3. Validar en test (sección G).
4. Setear `WHATSAPP_AUTO_REDEEM_WELCOME_GIFT=true` en el entorno (paso fuera de este alcance).

---

## F. Feature flag recomendada

- **Nombre:** `WHATSAPP_AUTO_REDEEM_WELCOME_GIFT`
- **Tipo:** server-only (NO `NEXT_PUBLIC_`; no debe llegar al cliente).
- **Default seguro:** `false` (sin la variable, Fase 3 queda desactivada y el flujo es el de Fase 2).
- **Activar solo cuando:** el SQL manual esté aplicado en `mleloxbpvkfdtnnpoeyr` y la prueba
  controlada haya pasado.
- **Kill-switch:** poner la flag en `false` revierte instantáneamente a `welcome_gift_pending`
  sin redeploy de base (solo cambio de env + restart/redeploy del runtime).

---

## G. Plan de validación paso a paso (entorno test)

> Ejecutar las verificaciones SQL como SELECT en el SQL Editor de `mleloxbpvkfdtnnpoeyr`.

**Preparación**
1. Usuario test `consumer` con `phone_normalized` cargado (el de Fase 2 sirve:
   `df93c902-78a3-4a46-b7de-a52ae7d0ed69`) y `welcome_gifts.redeemed_at IS NULL`.
   ```sql
   select id, role, phone_normalized from public.profiles where id = ':test';
   select profile_id, redeemed_at from public.welcome_gifts where profile_id = ':test';
   select coalesce(balance,0) from public.wallets where profile_id = ':test';
   ```
2. SQL manual aplicado (función + CHECK ampliado).
3. `WHATSAPP_AUTO_REDEEM_WELCOME_GIFT=true` en el entorno de prueba.

**Ejecución (primer mensaje)**
4. Desde el teléfono test, tocar el botón “Solicitar regalo por WhatsApp” (o enviar el
   texto de intención) al sandbox Twilio.
5. Verificar:
   ```sql
   -- transacción creada
   select tx_type, amount, note, created_at from public.point_transactions
     where to_profile_id = ':test' order by created_at desc limit 3;
   -- regalo marcado
   select redeemed_at from public.welcome_gifts where profile_id = ':test';
   -- saldo +10
   select balance from public.wallets where profile_id = ':test';
   -- trazabilidad inbound
   select action_taken, status, created_at from public.whatsapp_inbound_messages
     where matched_user_id = ':test' order by created_at desc limit 3;
   ```
   Esperado: `action_taken='welcome_gift_redeemed'`, una sola transacción earn +10,
   `redeemed_at` no nulo, balance incrementado en 10.

**Idempotencia (segundo mensaje)**
6. Repetir el mensaje desde el mismo teléfono.
7. Verificar que **NO** se creó otra transacción ni cambió el balance, y que el nuevo
   inbound quedó como `action_taken='welcome_gift_already_redeemed'`.
   ```sql
   select count(*) from public.point_transactions
     where to_profile_id = ':test' and note = 'Regalo de bienvenida (WhatsApp)';  -- debe ser 1
   ```

**Casos negativos (no deben activar)**
8. Teléfono sin cuenta → `user_not_found`. Texto sin intención → `ignored_message`.
   Dos perfiles con el mismo `phone_normalized` → `ambiguous_phone`. En ninguno hay earn.

**Rollback de prueba** (para re-testear): bloque comentado en el SQL manual.

---

## H. Archivo de documentación creado

- Este doc: `docs/cafecitos/WHATSAPP-INBOUND-PHASE3-DISENO-ACTIVACION-REGALO.md`
- SQL manual: `docs/cafecitos/sql/WHATSAPP-PHASE3-activate-welcome-gift-trusted.manual.sql`
  (marcado EJECUTAR MANUALMENTE, no ejecutado)

Referencias: `docs/cafecitos/WHATSAPP-INBOUND-PHASE2-CIERRE.md`,
`docs/cafecitos/WHATSAPP-SUPABASE-ROOT-CAUSE.md`.

---

## I. git status

Al cierre de esta tarea (ver salida real en la respuesta del chat):

- Untracked: `docs/cafecitos/CAFECITOS-CLEANUP-1-auditoria-usuarios-test.md` (de la tarea
  anterior, en pausa — **no** se siguió con limpieza)
- Untracked: `docs/cafecitos/WHATSAPP-INBOUND-PHASE3-DISENO-ACTIVACION-REGALO.md` (este doc)
- Untracked: `docs/cafecitos/sql/WHATSAPP-PHASE3-activate-welcome-gift-trusted.manual.sql`

Sin cambios en código funcional. Nada commiteado.

---

## J. Confirmaciones

- ❌ No se ejecutó SQL (el archivo está marcado EJECUTAR MANUALMENTE y no se corrió).
- ❌ No se tocaron datos.
- ❌ No se activaron regalos.
- ❌ No se tocó Twilio.
- ❌ No se tocó Vercel.
- ❌ No se modificaron variables de entorno.
- ❌ No se modificó código funcional (los diffs de la sección E son propuestas, no aplicadas).
- ❌ No se siguió con la limpieza de usuarios test (sigue en pausa).
- ✅ Solo se auditó código/migraciones y se crearon 2 archivos (doc + SQL manual).
