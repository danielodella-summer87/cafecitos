export const TIER_ORDER = ["starter", "pro", "leyenda"] as const;

export type TierSlug = (typeof TIER_ORDER)[number];

/**
 * Indica si el tier del usuario permite acceder al contenido que requiere minTierSlug.
 * Orden: starter -> pro -> leyenda (mayor índice = más nivel).
 */
export function canAccess(userTierSlug: string, minTierSlug: string): boolean {
  const userIdx = TIER_ORDER.indexOf(userTierSlug as TierSlug);
  const minIdx = TIER_ORDER.indexOf(minTierSlug as TierSlug);
  if (userIdx === -1) return minIdx <= 0;
  if (minIdx === -1) return true;
  return userIdx >= minIdx;
}
