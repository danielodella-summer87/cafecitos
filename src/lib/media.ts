/**
 * Resuelve una referencia a imagen (path o URL) para uso en src de <img>.
 * - null/undefined/"" -> null
 * - Si empieza con "http" -> se devuelve tal cual (URL absoluta).
 * - Si empieza con "/" -> se devuelve tal cual (path absoluto).
 * - Si empieza con "media/" -> se devuelve "/" + src.
 * - Si empieza con "public/" -> se devuelve "/" + src sin el prefijo "public/".
 */
export function resolvePublicImage(src?: string | null): string | null {
  const s = typeof src === "string" ? src.trim() : "";
  if (!s) return null;
  if (s.startsWith("http")) return s;
  if (s.startsWith("/")) return s;
  if (s.startsWith("media/")) return `/${s}`;
  if (s.startsWith("public/")) return `/${s.replace(/^public\//, "")}`;
  return null;
}
