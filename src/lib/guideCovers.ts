/**
 * Covers de Universo Café por slug + fallback genérico.
 * Uso: normalizeCoverUrl(cover_url) ?? COVER_BY_SLUG[slug] ?? GENERIC_COVER
 */
export function normalizeCoverUrl(input?: string | null): string | null {
  if (!input) return null;
  const v = input.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return v;
  if (v.startsWith("universo-cafe/")) return `/${v}`;
  return `/universo-cafe/${v}`;
}

export const GENERIC_COVER = "/universo-cafe/cover-generic.png";

export const COVER_BY_SLUG: Record<string, string> = {
  "cafe-filtrado-vs-espresso": "/universo-cafe/cafe-filtrado-vs-espresso.png",
  "prensa-francesa-french-press": "/universo-cafe/prensa-francesa.png",
  "v60-pour-over-la-receta-mas-simple": "/universo-cafe/v60-pour-over.png",
  "cafetera-italiana-moka-que-no-amargue": "/universo-cafe/moka-italiana.png",
  "origenes-brasil-colombia-etiopia-rapido": "/universo-cafe/origenes-brasil-colombia-etiopia.png",
  "acidez-vs-amargor-como-entenderlo": "/universo-cafe/acidez-vs-amargor.png",
  "que-es-el-cafe-de-especialidad": "/universo-cafe/cafe-especialidad.png",
  "prensa-francesa": "/universo-cafe/prensa-francesa.png",
  "v60-pour-over": "/universo-cafe/v60-pour-over.png",
  "moka-italiana": "/universo-cafe/moka-italiana.png",
  "origenes-brasil-colombia-etiopia": "/universo-cafe/origenes-brasil-colombia-etiopia.png",
  "acidez-vs-amargor": "/universo-cafe/acidez-vs-amargor.png",
};

/** Deriva clave para COVER_BY_SLUG desde el título (compat con slugs cortos y largos). */
export function getCoverSlugFromTitle(title: string): string | undefined {
  const t = title.toLowerCase();
  if (t.includes("qué es el café") || t.includes("cafe de especialidad")) return "que-es-el-cafe-de-especialidad";
  if (t.includes("filtrado") && t.includes("espresso")) return "cafe-filtrado-vs-espresso";
  if (t.includes("prensa francesa")) return "prensa-francesa-french-press";
  if (t.includes("v60") || t.includes("pour over")) return "v60-pour-over-la-receta-mas-simple";
  if (t.includes("moka") || t.includes("cafetera italiana")) return "cafetera-italiana-moka-que-no-amargue";
  if (t.includes("orígenes") && (t.includes("brasil") || t.includes("colombia"))) return "origenes-brasil-colombia-etiopia-rapido";
  if (t.includes("acidez") && t.includes("amargor")) return "acidez-vs-amargor-como-entenderlo";
  return undefined;
}
