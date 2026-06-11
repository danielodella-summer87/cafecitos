-- =============================================================================
-- EJECUTAR MANUALMENTE EN SUPABASE (SQL Editor o CLI con confirmación humana).
-- NO activa regalos. NO modifica redeem_welcome_gift. NO crea RPC de activación.
-- Solo agrega normalización de teléfono en profiles y trazabilidad inbound WhatsApp.
-- =============================================================================

-- 1) Normalización de teléfono en perfiles (lookup por webhook Fase 2+)
alter table public.profiles
  add column if not exists phone_normalized text;

comment on column public.profiles.phone_normalized is
  'Teléfono móvil UY E.164 sin + (ej. 59894735020). Poblado por backfill o registro futuro.';

create index if not exists profiles_phone_normalized_consumer_idx
  on public.profiles (phone_normalized)
  where phone_normalized is not null and role = 'consumer';

-- 2) Trazabilidad de mensajes entrantes WhatsApp (Twilio inbound webhook)
create table if not exists public.whatsapp_inbound_messages (
  id uuid primary key default gen_random_uuid(),
  whatsapp_from text not null,
  whatsapp_from_normalized text,
  whatsapp_profile_name text,
  whatsapp_message_body text,
  whatsapp_received_at timestamptz not null default now(),
  matched_user_id uuid references public.profiles(id) on delete set null,
  action_taken text not null,
  status text not null default 'processed',
  provider text not null default 'twilio',
  provider_message_id text,
  raw_payload_json jsonb,
  created_at timestamptz not null default now(),
  constraint whatsapp_inbound_messages_action_taken_chk check (
    action_taken in (
      'invalid_phone',
      'user_not_found',
      'ambiguous_phone',
      'already_redeemed',
      'welcome_gift_pending',
      'ignored_message',
      'persist_skipped',
      'error'
    )
  ),
  constraint whatsapp_inbound_messages_status_chk check (
    status in ('processed', 'error', 'skipped')
  )
);

create unique index if not exists whatsapp_inbound_messages_provider_message_id_uidx
  on public.whatsapp_inbound_messages (provider_message_id)
  where provider_message_id is not null;

comment on table public.whatsapp_inbound_messages is
  'Mensajes entrantes WhatsApp (Twilio). Fase 2: trazabilidad y lookup; Fase 3: activación automática.';

-- RLS: solo service_role desde el webhook server-side (sin políticas públicas por ahora)
alter table public.whatsapp_inbound_messages enable row level security;

-- =============================================================================
-- BACKFILL phone_normalized (NO ejecutar automáticamente sin revisar).
-- La normalización canónica está en src/lib/phone/uy.ts (TypeScript).
-- Preferir script de backfill desde la app o SQL revisado fila a fila.
-- =============================================================================
--
-- Ejemplo orientativo (ajustar antes de ejecutar):
--
-- update public.profiles p
-- set phone_normalized = /* aplicar misma lógica que normalizeUyMobilePhone en TS */
-- where p.phone is not null
--   and p.phone_normalized is null
--   and p.role = 'consumer';
--
