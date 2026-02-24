/**
 * Debug de imágenes: solo activo cuando NEXT_PUBLIC_MEDIA_DEBUG=1 en .env.local
 */
export const SHOW_MEDIA_DEBUG =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_MEDIA_DEBUG === "1";

/**
 * Genera un label para mostrar debajo de la imagen (src final + etiquetas).
 */
export function getImageDebugLabel(
  src: string | null | undefined,
  fallback: string
): string {
  const s = src ?? null;
  if (s === null || s === undefined || String(s).trim() === "") {
    return `src=NULL (fallback=${fallback})`;
  }
  const t = String(s).trim();
  const parts: string[] = [];
  if (t.startsWith("/media/cover-default")) parts.push("[FALLBACK]");
  else if (t.startsWith("http")) parts.push("[REMOTE]");
  else if (t.startsWith("/media/") || t.startsWith("media/")) parts.push("[LOCAL MEDIA]");
  parts.push(`src=${t}`);
  return parts.join(" ");
}
