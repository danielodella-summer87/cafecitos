import { slugify } from "@/lib/slug";

/**
 * Covers dinámicos por slug para Universo Café.
 * Uso: getGuideCover(guide) → cover_url || COVER_BY_SLUG[slug] || fallback genérico.
 */
export const COVER_BY_SLUG: Record<string, string> = {
  "cafe-filtrado-vs-espresso-en-2-minutos": "/universo-cafe/cafe-filtrado-vs-espresso.png",
  "prensa-francesa-french-press-paso-a-paso": "/universo-cafe/prensa-francesa.png",
  "v60-pour-over-la-receta-mas-simple": "/universo-cafe/v60-pour-over.png",
  "cafetera-italiana-moka-que-no-amargue": "/universo-cafe/moka-italiana.png",
  "origenes-brasil-colombia-etiopia-rapido": "/universo-cafe/origenes-brasil-colombia-etiopia.png",
  "acidez-vs-amargor-como-entenderlo": "/universo-cafe/acidez-vs-amargor.png",
  "que-es-el-cafe-de-especialidad": "/universo-cafe/cafe-especialidad.png",
};

export const GENERIC_COVER = "/universo-cafe/cover-generic.png";

export type GuideCoverInput = {
  cover_url?: string | null;
  slug?: string | null;
  title?: string;
};

export function getGuideCover(guide: GuideCoverInput): string {
  const url = guide.cover_url && String(guide.cover_url).trim();
  if (url && !url.startsWith("javascript:")) return url;
  const slug = guide.slug || (guide.title ? slugify(guide.title) : "");
  return COVER_BY_SLUG[slug] || GENERIC_COVER;
}
