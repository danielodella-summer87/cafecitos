/**
 * WhatsApp oficial de Cafecitos (links wa.me).
 *
 * Configurar el número real con la variable pública:
 *   NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER=598XXXXXXXX
 * (E.164 sin +, sin espacios; ej. Uruguay: 598 + 8 dígitos móvil)
 *
 * En local: `.env.local` · En producción: Vercel → Settings → Environment Variables.
 */

/** Solo fallback si falta la env var (p. ej. dev sin `.env.local`). No es válido en WhatsApp. */
const PLACEHOLDER_WHATSAPP_NUMBER = "59800000000";

function normalizeWhatsAppNumber(raw: string): string {
  return raw.replace(/[\s\-()]/g, "").replace(/^\+/, "").replace(/\D/g, "");
}

const rawWhatsAppNumber =
  process.env.NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER?.trim() || PLACEHOLDER_WHATSAPP_NUMBER;

/** Número oficial Cafecitos para wa.me (E.164 sin +, sin espacios). */
export const CAFECITOS_WHATSAPP_NUMBER = normalizeWhatsAppNumber(rawWhatsAppNumber);

export const WELCOME_GIFT_WHATSAPP_MESSAGE =
  "Hola Cafecitos, quiero activar mi regalo de bienvenida.";

export function buildCafecitosWhatsAppUrl(
  message: string = WELCOME_GIFT_WHATSAPP_MESSAGE
): string {
  return `https://wa.me/${CAFECITOS_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
