import { resolvePublicImage } from "@/lib/media";

const DEFAULT_PROMOTION_IMAGE = "/media/cover-default.jpg";

export type PromotionImageLike = {
  image_path?: string | null;
};

/**
 * Resuelve la imagen de una promoción: solo image_path, fallback si falta.
 * No usar image_url. resolvePublicImage normaliza "media/..." a "/media/...".
 */
export function resolvePromotionImage(promo?: PromotionImageLike | null): string {
  const src = resolvePublicImage(promo?.image_path ?? null);
  return src ?? DEFAULT_PROMOTION_IMAGE;
}

export { DEFAULT_PROMOTION_IMAGE as DEFAULT_PROMO_IMAGE };
