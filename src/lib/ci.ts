/**
 * Utilidades para CI (cédula de identidad) en la app.
 * Criterio: exactamente 8 dígitos (0-9), sin puntos ni guiones.
 */

/** Deja solo dígitos y limita a 8 caracteres. */
export function normalizeCi(input: string): string {
  return String(input ?? "").replace(/\D/g, "").slice(0, 8);
}

/** true si la cadena es exactamente 8 dígitos. */
export function isValidCi(ci: string): boolean {
  return /^\d{8}$/.test(String(ci ?? "").trim());
}
