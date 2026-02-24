import { resolvePublicImage } from "@/lib/media";

/** Solo usa image_path (cafes no tiene image_url en DB). */
export type CafeImageLike = {
  image_path?: string | null;
};

export function resolveCafeImage(cafe?: CafeImageLike | null): string {
  return (
    resolvePublicImage(cafe?.image_path ?? null) ?? "/media/cover-default.jpg"
  );
}
