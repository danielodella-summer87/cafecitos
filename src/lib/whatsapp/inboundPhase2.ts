import { WELCOME_GIFT_WHATSAPP_MESSAGE } from "@/lib/cafecitosWhatsApp";
import { normalizeUyMobilePhone } from "@/lib/phone/uy";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type InboundActionTaken =
  | "invalid_phone"
  | "user_not_found"
  | "ambiguous_phone"
  | "already_redeemed"
  | "welcome_gift_pending"
  | "ignored_message"
  | "persist_skipped"
  | "error"
  // Fase 3 (activación automática). Solo se usan cuando WHATSAPP_AUTO_REDEEM_WELCOME_GIFT=true
  // y el SQL manual (RPC + CHECK ampliado) ya está aplicado en el Supabase canónico.
  | "welcome_gift_redeemed"
  | "welcome_gift_already_redeemed"
  | "welcome_gift_redeem_failed";

export type InboundProcessInput = {
  from: string;
  to: string;
  body: string;
  profileName: string;
  waId: string;
  messageSid: string;
  accountSid: string;
  rawPayload: Record<string, string>;
};

export type InboundProcessResult = {
  normalizedPhone: string | null;
  hasValidPhone: boolean;
  actionTaken: InboundActionTaken;
  matchedUserId: string | null;
  matchedUserName: string | null;
  persistOk: boolean;
  persistError: string | null;
  lookupSkipped: boolean;
};

const TWIML_INVALID_PHONE =
  "Recibimos tu mensaje, pero no pudimos validar el número de WhatsApp. Por favor escribinos desde el teléfono registrado en Cafecitos.";

const TWIML_USER_NOT_FOUND =
  "No encontramos una cuenta Cafecitos con este número. Verificá que escribas desde el teléfono que registraste en la app.";

const TWIML_AMBIGUOUS_PHONE =
  "Encontramos más de una cuenta con este número. Contactá a la cafetería para que te ayuden a validar tu registro.";

const TWIML_ALREADY_REDEEMED =
  "Tu regalo de bienvenida ya está activo ✅ Podés verlo en tu app Cafecitos.";

const TWIML_WELCOME_GIFT_PENDING =
  "Hola, recibimos tu mensaje en Cafecitos ✅ En breve te confirmamos tu regalo de bienvenida.";

const TWIML_IGNORED_MESSAGE =
  "Hola, gracias por escribir a Cafecitos. Si querés activar tu regalo de bienvenida, enviá el mensaje desde la app con el botón Solicitar regalo por WhatsApp.";

const TWIML_REDEEM_FAILED =
  "Recibimos tu solicitud ✅ Tuvimos un problema al activar el regalo; lo revisamos y te confirmamos en breve.";

export function twimlReplyForAction(
  action: InboundActionTaken,
  matchedUserName: string | null,
  welcomeIntent: boolean
): string {
  if (action === "persist_skipped") {
    return welcomeIntent ? TWIML_WELCOME_GIFT_PENDING : TWIML_IGNORED_MESSAGE;
  }

  switch (action) {
    case "invalid_phone":
      return TWIML_INVALID_PHONE;
    case "user_not_found":
      return TWIML_USER_NOT_FOUND;
    case "ambiguous_phone":
      return TWIML_AMBIGUOUS_PHONE;
    case "already_redeemed":
      return TWIML_ALREADY_REDEEMED;
    case "welcome_gift_pending": {
      const name = matchedUserName?.trim();
      return name
        ? `Hola ${name}, recibimos tu solicitud en Cafecitos ✅ En breve te confirmamos tu regalo de bienvenida.`
        : TWIML_WELCOME_GIFT_PENDING;
    }
    case "welcome_gift_redeemed": {
      const name = matchedUserName?.trim();
      return name
        ? `¡Listo ${name}! Activamos tu regalo de bienvenida 🎁 Tenés 10 cafecitos en tu cuenta.`
        : "¡Listo! Activamos tu regalo de bienvenida 🎁 Tenés 10 cafecitos en tu cuenta.";
    }
    case "welcome_gift_already_redeemed":
      return TWIML_ALREADY_REDEEMED;
    case "welcome_gift_redeem_failed":
      return TWIML_REDEEM_FAILED;
    case "ignored_message":
      return TWIML_IGNORED_MESSAGE;
    case "error":
    default:
      return welcomeIntent ? TWIML_WELCOME_GIFT_PENDING : TWIML_IGNORED_MESSAGE;
  }
}

// Fase 3 · Feature flag server-only. Default seguro: false si la variable no existe.
// Con false, el flujo se mantiene en welcome_gift_pending (Fase 2) y NUNCA llama la RPC.
function isAutoRedeemEnabled(): boolean {
  return process.env.WHATSAPP_AUTO_REDEEM_WELCOME_GIFT === "true";
}

// Fase 3 · Activación "confiada" vía RPC server-only (sin código DDMM).
// Solo se invoca cuando la flag está ON y el match por phone_normalized fue único.
// La RPC es idempotente: si el regalo ya estaba activo devuelve status 'already_redeemed'.
async function activateWelcomeGiftTrusted(
  profileId: string
): Promise<
  "welcome_gift_redeemed" | "welcome_gift_already_redeemed" | "welcome_gift_redeem_failed"
> {
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

export function isWelcomeGiftIntent(body: string): boolean {
  const normalized = body.trim().toLowerCase();
  const target = WELCOME_GIFT_WHATSAPP_MESSAGE.trim().toLowerCase();
  if (normalized === target) return true;
  return normalized.includes("regalo") && (normalized.includes("bienvenida") || normalized.includes("activar"));
}

function isSchemaNotReadyError(message: string | undefined, code: string | undefined): boolean {
  const msg = (message ?? "").toLowerCase();
  if (code === "42P01" || code === "42703" || code === "PGRST204" || code === "PGRST205") return true;
  if (msg.includes("does not exist") || msg.includes("could not find")) return true;
  if (msg.includes("phone_normalized") && msg.includes("column")) return true;
  return false;
}

type ProfileMatch = { id: string; full_name: string | null };

async function lookupConsumersByPhone(
  normalizedPhone: string
): Promise<{ ok: true; profiles: ProfileMatch[] } | { ok: false; skipped: boolean; error: string }> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "consumer")
    .eq("phone_normalized", normalizedPhone);

  if (error) {
    if (isSchemaNotReadyError(error.message, error.code)) {
      return { ok: false, skipped: true, error: error.message };
    }
    return { ok: false, skipped: false, error: error.message };
  }

  return { ok: true, profiles: (data ?? []) as ProfileMatch[] };
}

async function isWelcomeGiftRedeemed(profileId: string): Promise<boolean> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("welcome_gifts")
    .select("redeemed_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    if (isSchemaNotReadyError(error.message, error.code)) return false;
    throw new Error(error.message);
  }

  return !!data?.redeemed_at;
}

async function persistInboundMessage(input: {
  whatsappFrom: string;
  normalizedPhone: string | null;
  profileName: string;
  body: string;
  messageSid: string;
  matchedUserId: string | null;
  actionTaken: InboundActionTaken;
  rawPayload: Record<string, string>;
}): Promise<{ ok: boolean; error: string | null; skipped: boolean }> {
  try {
    const supabase = supabaseAdmin();
    const { error } = await supabase.from("whatsapp_inbound_messages").insert({
      whatsapp_from: input.whatsappFrom,
      whatsapp_from_normalized: input.normalizedPhone,
      whatsapp_profile_name: input.profileName || null,
      whatsapp_message_body: input.body,
      matched_user_id: input.matchedUserId,
      action_taken: input.actionTaken,
      status: input.actionTaken === "error" ? "error" : "processed",
      provider: "twilio",
      provider_message_id: input.messageSid || null,
      raw_payload_json: input.rawPayload,
    });

    if (error) {
      if (error.code === "23505") return { ok: true, error: null, skipped: false };
      if (isSchemaNotReadyError(error.message, error.code)) {
        return { ok: false, error: error.message, skipped: true };
      }
      return { ok: false, error: error.message, skipped: false };
    }

    return { ok: true, error: null, skipped: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown persist error";
    return { ok: false, error: message, skipped: false };
  }
}

export async function processInboundMessagePhase2(
  input: InboundProcessInput
): Promise<InboundProcessResult> {
  const normalizedPhone =
    normalizeUyMobilePhone(input.from) ?? normalizeUyMobilePhone(input.waId);
  const hasValidPhone = normalizedPhone !== null;
  const welcomeIntent = isWelcomeGiftIntent(input.body);

  let actionTaken: InboundActionTaken;
  let matchedUserId: string | null = null;
  let matchedUserName: string | null = null;
  let lookupSkipped = false;

  if (!hasValidPhone) {
    actionTaken = "invalid_phone";
  } else if (!welcomeIntent) {
    actionTaken = "ignored_message";
    const lookup = await lookupConsumersByPhone(normalizedPhone);
    if (!lookup.ok) {
      if (lookup.skipped) lookupSkipped = true;
    } else if (lookup.profiles.length === 1) {
      matchedUserId = lookup.profiles[0].id;
      matchedUserName = lookup.profiles[0].full_name;
    }
  } else {
    const lookup = await lookupConsumersByPhone(normalizedPhone);
    if (!lookup.ok) {
      lookupSkipped = lookup.skipped;
      actionTaken = lookup.skipped ? "persist_skipped" : "error";
    } else if (lookup.profiles.length === 0) {
      actionTaken = "user_not_found";
    } else if (lookup.profiles.length > 1) {
      actionTaken = "ambiguous_phone";
    } else {
      matchedUserId = lookup.profiles[0].id;
      matchedUserName = lookup.profiles[0].full_name;
      try {
        const redeemed = await isWelcomeGiftRedeemed(matchedUserId);
        if (redeemed) {
          actionTaken = "already_redeemed";
        } else if (isAutoRedeemEnabled()) {
          // Fase 3 ON: activación automática e idempotente vía RPC server-only.
          actionTaken = await activateWelcomeGiftTrusted(matchedUserId);
        } else {
          // Fase 3 OFF (default): comportamiento de Fase 2, sin activar nada.
          actionTaken = "welcome_gift_pending";
        }
      } catch {
        actionTaken = "error";
      }
    }
  }

  const persistAction =
    lookupSkipped && actionTaken !== "invalid_phone" ? "persist_skipped" : actionTaken;

  const persist = await persistInboundMessage({
    whatsappFrom: input.from,
    normalizedPhone,
    profileName: input.profileName,
    body: input.body,
    messageSid: input.messageSid,
    matchedUserId,
    actionTaken: persistAction,
    rawPayload: input.rawPayload,
  });

  if (persist.skipped) {
    lookupSkipped = true;
    if (actionTaken !== "invalid_phone" && actionTaken !== "error") {
      actionTaken = "persist_skipped";
    }
  }

  return {
    normalizedPhone,
    hasValidPhone,
    actionTaken,
    matchedUserId,
    matchedUserName,
    persistOk: persist.ok,
    persistError: persist.error,
    lookupSkipped,
  };
}
