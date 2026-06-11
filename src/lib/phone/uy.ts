/**
 * Normaliza un teléfono móvil uruguayo a E.164 sin + (ej. 59894735020).
 * Devuelve null si el formato no es válido.
 */
export function normalizeUyMobilePhone(raw: string): string | null {
  if (!raw?.trim()) return null;

  let digits = raw
    .trim()
    .replace(/^whatsapp:/i, "")
    .replace(/[\s\-()]/g, "")
    .replace(/^\+/, "")
    .replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = "598" + digits.slice(1);
  } else if (!digits.startsWith("598") && digits.length === 8) {
    digits = "598" + digits;
  }

  if (!/^598\d{8}$/.test(digits)) return null;
  return digits;
}
