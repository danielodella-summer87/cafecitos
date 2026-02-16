/**
 * Slugify robusto sin Unicode property escapes (\p{...}) para máxima compatibilidad.
 * Usa normalize('NFD') + rango de caracteres diacríticos.
 */
export function slugify(input: string): string {
  return (input ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
