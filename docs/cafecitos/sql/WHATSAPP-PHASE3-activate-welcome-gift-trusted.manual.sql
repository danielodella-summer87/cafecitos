-- =============================================================================
-- EJECUTAR MANUALMENTE EN SUPABASE
-- NO EJECUTAR AUTOMÁTICAMENTE
-- NO APLICADO TODAVÍA
-- Supabase canónico: cafecitos / mleloxbpvkfdtnnpoeyr
-- =============================================================================
-- FASE 3 WhatsApp · Activación automática del regalo de bienvenida
-- (Movido fuera de supabase/migrations/ a propósito para que NO lo aplique un
--  `supabase db push`. Correr a mano en SQL Editor o CLI con confirmación humana.)
--
-- ESTE ARCHIVO NO SE EJECUTÓ AUTOMÁTICAMENTE.
-- NO toca datos productivos por sí solo (solo crea RPC + amplía un CHECK).
-- NO modifica redeem_welcome_gift (la ruta por código DDMM de la app queda intacta).
-- NO activa ningún regalo: solo deja disponible la función para que el webhook la llame
-- cuando la feature flag WHATSAPP_AUTO_REDEEM_WELCOME_GIFT esté en true.
--
-- ORDEN DE ROLLOUT RECOMENDADO:
--   1) Ejecutar este SQL (paso 1 y paso 2 de abajo).
--   2) Desplegar el código de Fase 3 con la flag en false (no cambia comportamiento).
--   3) Probar en un usuario test (ver plan de validación en el doc de diseño).
--   4) Recién entonces poner la flag en true.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 0 · Validación PREVIA (read-only) — ejecutar y revisar antes de seguir
-- -----------------------------------------------------------------------------
-- ¿Existe ya la función? (no debería, salvo reintento)
-- select proname from pg_proc where proname = 'activate_welcome_gift_trusted';
--
-- ¿Qué valores permite hoy el CHECK de action_taken?
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conname = 'whatsapp_inbound_messages_action_taken_chk';

-- -----------------------------------------------------------------------------
-- PASO 1 · Ampliar el CHECK de action_taken con los 3 resultados de Fase 3
-- (welcome_gift_redeemed / welcome_gift_already_redeemed / welcome_gift_redeem_failed)
-- Sin esto, el INSERT del webhook con los nuevos action_taken sería rechazado.
-- -----------------------------------------------------------------------------
alter table public.whatsapp_inbound_messages
  drop constraint if exists whatsapp_inbound_messages_action_taken_chk;

alter table public.whatsapp_inbound_messages
  add constraint whatsapp_inbound_messages_action_taken_chk check (
    action_taken in (
      -- Fase 2 (existentes)
      'invalid_phone',
      'user_not_found',
      'ambiguous_phone',
      'already_redeemed',
      'welcome_gift_pending',
      'ignored_message',
      'persist_skipped',
      'error',
      -- Fase 3 (nuevos)
      'welcome_gift_redeemed',
      'welcome_gift_already_redeemed',
      'welcome_gift_redeem_failed'
    )
  );

-- -----------------------------------------------------------------------------
-- PASO 2 · RPC server-only de activación "confiada" (sin código DDMM)
--
-- Modelo de confianza: la prueba de posesión NO es el código DDMM, sino haber
-- escrito por WhatsApp desde el phone_normalized registrado. Esa verificación la
-- hace el webhook (lookup único por phone_normalized + role='consumer') ANTES de
-- llamar a esta función. Por eso la función solo se concede a service_role.
--
-- Propiedades:
--   - Idempotente y atómico: el "claim" del regalo es un UPDATE condicional con
--     lock de fila; dos mensajes simultáneos -> solo uno acredita, el otro recibe
--     already_redeemed. Si el INSERT de la transacción falla, revierte todo.
--   - Acredita +10 con el MISMO mecanismo earn que el resto de la app; el trigger
--     trg_apply_point_transaction actualiza wallets.balance automáticamente.
--   - No depende de PIN ni de texto libre; requiere un p_profile_id ya verificado.
-- -----------------------------------------------------------------------------
create or replace function public.activate_welcome_gift_trusted(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role    app_role;
  v_claimed uuid;
begin
  -- (a) El perfil debe existir y ser consumer
  select p.role into v_role
  from public.profiles p
  where p.id = p_profile_id;

  if v_role is null then
    return jsonb_build_object('ok', false, 'status', 'user_not_found',
      'message', 'Perfil no encontrado');
  end if;

  if v_role <> 'consumer' then
    return jsonb_build_object('ok', false, 'status', 'redeem_failed',
      'message', 'El perfil no es consumer');
  end if;

  -- (b) Garantizar que exista la fila objetivo del claim
  insert into public.welcome_gifts (profile_id)
  values (p_profile_id)
  on conflict (profile_id) do nothing;

  -- (c) Claim atómico e idempotente: solo la primera llamada concurrente
  --     consigue marcar redeemed_at (las demás obtienen 0 filas -> already_redeemed)
  update public.welcome_gifts
    set redeemed_at = now()
    where profile_id = p_profile_id
      and redeemed_at is null
    returning profile_id into v_claimed;

  if v_claimed is null then
    return jsonb_build_object('ok', false, 'status', 'already_redeemed',
      'message', 'El regalo de bienvenida ya estaba activo');
  end if;

  -- (d) Acreditar +10 (earn). El trigger actualiza wallets.balance en la misma tx.
  insert into public.point_transactions (
    tx_type,
    cafe_id,
    actor_owner_profile_id,
    from_profile_id,
    to_profile_id,
    amount,
    note
  ) values (
    'earn',
    null,
    null,
    null,
    p_profile_id,
    10,
    'Regalo de bienvenida (WhatsApp)'
  );

  return jsonb_build_object('ok', true, 'status', 'redeemed', 'credited', 10,
    'message', 'Regalo activado. ¡Disfrutá tus 10 cafecitos!');
end;
$$;

-- Solo el backend (service role) puede invocarla. NO conceder a authenticated:
-- a diferencia de redeem_welcome_gift, esta ruta no exige código y no debe quedar
-- expuesta a un cliente autenticado.
revoke all on function public.activate_welcome_gift_trusted(uuid) from public;
grant execute on function public.activate_welcome_gift_trusted(uuid) to service_role;

comment on function public.activate_welcome_gift_trusted(uuid) is
  'Fase 3 WhatsApp: activa el regalo de bienvenida SIN código DDMM. La prueba de posesion es haber escrito desde el phone_normalized registrado (verificado por el webhook). Idempotente, atomico, solo service_role. No reemplaza redeem_welcome_gift.';

-- -----------------------------------------------------------------------------
-- PASO 3 · Validación POSTERIOR (read-only)
-- -----------------------------------------------------------------------------
-- select proname, pg_get_function_identity_arguments(oid)
-- from pg_proc where proname = 'activate_welcome_gift_trusted';
--
-- select pg_get_constraintdef(oid)
-- from pg_constraint where conname = 'whatsapp_inbound_messages_action_taken_chk';

-- -----------------------------------------------------------------------------
-- ROLLBACK LÓGICO (solo para entorno de prueba; NO usar en datos reales)
-- Revierte el efecto de UNA activación de prueba para poder re-testear idempotencia.
-- Reemplazar :test_profile_id por el UUID del usuario test.
-- -----------------------------------------------------------------------------
-- begin;
--   -- 1) borrar SOLO la transacción de regalo de ese test (revisar antes con select)
--   -- delete from public.point_transactions
--   --   where to_profile_id = ':test_profile_id'
--   --     and tx_type = 'earn'
--   --     and note = 'Regalo de bienvenida (WhatsApp)';
--   -- 2) re-abrir el regalo
--   -- update public.welcome_gifts set redeemed_at = null where profile_id = ':test_profile_id';
--   -- Nota: el trigger NO descuenta en delete; ajustar wallets.balance a mano si se requiere.
-- commit;  -- o rollback; mientras se valida
