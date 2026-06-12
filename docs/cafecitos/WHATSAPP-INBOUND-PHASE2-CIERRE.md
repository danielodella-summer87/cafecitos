# WhatsApp inbound · Fase 2 — Cierre validado

> Documento de cierre. **Solo documentación.** No aplicar cambios desde este archivo.
> No ejecutar SQL, no activar regalos, no tocar Twilio/Vercel/variables.

- **Fecha de cierre:** 2026-06-12
- **Supabase canónico:** **cafecitos** (`mleloxbpvkfdtnnpoeyr`)
- **Estado:** Fase 2 (inbound + lookup + persistencia) **validada end-to-end**
- **Fase 3 (activación automática de regalo):** **pendiente**, por diseño
- **Causa raíz original:** ver `docs/cafecitos/WHATSAPP-SUPABASE-ROOT-CAUSE.md`

---

## A. Qué quedó validado

- El webhook `POST /api/whatsapp/inbound` **persiste** correctamente en
  `whatsapp_inbound_messages` del Supabase canónico (`mleloxbpvkfdtnnpoeyr`).
  Desapareció el error `PGRST205` (`Could not find the table ... in the schema cache`).
- El **lookup por `profiles.phone_normalized`** funciona: tras corregir el
  `phone_normalized` del perfil de prueba, el mensaje matcheó al usuario real.
- El **Twilio Sandbox** funciona y sigue respondiendo TwiML automático.
- **Vercel apunta al Supabase correcto** (`mleloxbpvkfdtnnpoeyr`).
- `NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER` apunta al **sandbox de Twilio**.
- **No se activó ningún regalo automáticamente** — el flujo se detiene en
  `welcome_gift_pending`, que es el comportamiento esperado para Fase 2.

---

## B. Evidencia

Secuencia de mensajes de prueba contra el canónico `mleloxbpvkfdtnnpoeyr`:

| # | Evento | `action_taken` | `status` | Notas |
|---|--------|----------------|----------|-------|
| 1 | Primer mensaje | `ignored_message` | — | No era solicitud de regalo |
| 2 | Segundo mensaje | `user_not_found` | — | Teléfono aún sin `phone_normalized` que matchee |
| 3 | Tercer mensaje (tras corregir `phone_normalized` del perfil de prueba 7) | `welcome_gift_pending` | `processed` | `matched_user_id = df93c902-78a3-4a46-b7de-a52ae7d0ed69` |

Confirmaciones adicionales:

- Twilio Sandbox → POST inbound → Vercel: OK.
- Vercel → Supabase `mleloxbpvkfdtnnpoeyr`: OK (persistencia confirmada).
- `NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER` → sandbox Twilio: OK.
- Persistencia en `whatsapp_inbound_messages`: OK.
- Lookup por `phone_normalized`: OK.
- Activación automática de regalo: **no ocurrió** (correcto para Fase 2).

---

## C. Qué sigue pendiente

- **Fase 3:** activación automática del regalo de bienvenida vía RPC
  `activate_welcome_gift_trusted` (con SQL/manual controlado). Hoy el flujo se
  detiene en `welcome_gift_pending`.
- **Backfill de `profiles.phone_normalized`** para el resto de usuarios reales
  (no solo el perfil de prueba), de modo que el lookup matchee a más clientes.
  Ver `docs/cafecitos/WHATSAPP-INBOUND-PHASE2.md`.
- **Decisión sobre `cafecitos-prod` (`lxiwhuzdzxmgvnoaswzv`):** dejar quieto;
  opcionalmente renombrar/documentar como "no producción". No borrar ni migrar.

---

## D. Riesgos / observaciones

- **Dos proyectos Supabase coexisten.** El canónico es `mleloxbpvkfdtnnpoeyr`; el
  otro (`lxiwhuzdzxmgvnoaswzv`) sigue existiendo y es fuente de confusión. Cualquier
  SQL/seed/migración futura debe verificar primero contra **cuál** proyecto corre.
- **Entorno local vs producción:** `.env.local` puede seguir apuntando a otro
  proyecto (`mleloxbpvkfdtnnpoeyr` vs el viejo de desarrollo). Validar antes de
  probar inbound en local. Ver memoria `supabase-project-mismatch`.
- **Sandbox de Twilio, no número productivo.** El inbound se validó contra el
  sandbox; pasar a un número WhatsApp productivo es un paso aparte (no hecho aquí).
- **`welcome_gift_pending` no es regalo activado.** Si alguien interpreta ese estado
  como "regalo entregado", sería un error: Fase 3 todavía no existe.
- **Match dependiente de `phone_normalized`.** Sin backfill completo, la mayoría de
  los mensajes reales caerán en `user_not_found` aunque el sistema funcione bien.

---

## E. git status

Al cierre de esta tarea (solo documentación, sin tocar código funcional):

```
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/cafecitos/WHATSAPP-INBOUND-PHASE2-CIERRE.md
	docs/cafecitos/WHATSAPP-SUPABASE-ROOT-CAUSE.md
```

> `WHATSAPP-SUPABASE-ROOT-CAUSE.md` aparece como untracked porque aún no estaba
> commiteado; en esta tarea se le agregó la sección "✅ CIERRE VALIDADO". No se
> modificó código funcional, no se ejecutó SQL, no se activaron regalos y no se
> tocaron Twilio, Vercel ni variables de entorno.
