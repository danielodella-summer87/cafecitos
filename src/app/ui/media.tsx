"use client";

import { useState } from "react";
import Image from "next/image";
import { SHOW_MEDIA_DEBUG } from "@/lib/mediaDebug";
import { Card, CardTitle, CardSubtitle, Button } from "./components";
import CafeName from "./CafeName";

const DEFAULT_COVER = "/media/cover-default.jpg";

type CafeItem = { id?: string; name?: string } | string;

export function PromoCard({
  title,
  description,
  image,
  cta,
  cafes,
  onDiscoverClick,
  onOpenCafe,
  fallbackImage = DEFAULT_COVER,
  debugLabel,
}: {
  title: string;
  description: React.ReactNode;
  image: string;
  cta?: string;
  cafes?: CafeItem[];
  onDiscoverClick?: () => void;
  /** Al hacer click en una cafetería del listado "Te esperamos en …" */
  onOpenCafe?: (idOrName: string) => void;
  fallbackImage?: string;
  /** Solo se muestra cuando NEXT_PUBLIC_MEDIA_DEBUG=1 */
  debugLabel?: string;
}) {
  const [imgSrc, setImgSrc] = useState(image);
  const list = (cafes ?? []).filter(Boolean);
  const hasCafes = list.length > 0;

  return (
    <Card className="h-full overflow-visible !bg-[#F6EFE6] border border-[rgba(15,23,42,0.10)] p-0">
      {/* Imagen */}
      <div className="relative h-36 sm:h-40 w-full overflow-hidden rounded-t-2xl">
        <Image
          src={imgSrc}
          alt={title}
          fill
          className="object-cover"
          onError={() => setImgSrc(fallbackImage ?? DEFAULT_COVER)}
          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 48vw, 24vw"
        />
      </div>
      {SHOW_MEDIA_DEBUG && debugLabel != null && (
        <div className="text-[10px] opacity-60 mt-1 break-all px-4">{debugLabel}</div>
      )}

      {/* Body */}
      <div className="flex h-full flex-col px-4 py-4">
        <div>
          <CardTitle className="text-base sm:text-lg leading-snug">
            {title}
          </CardTitle>
          <CardSubtitle className="mt-2 text-sm leading-relaxed line-clamp-4">
            {description}
          </CardSubtitle>
        </div>

        {/* Cafeterías colapsadas (sin chips visibles cerrado); z-50 para que no lo recorte el padre */}
        <div className="mt-3 relative z-50">
          <details className="rounded-xl border border-[rgba(15,23,42,0.15)] bg-white/40 px-3 py-2 group">
            <summary className="cursor-pointer list-none select-none flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-[#0F172A]">
                Te esperamos en …
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span aria-hidden className="text-base leading-none">🏠</span>
                <span aria-hidden className="text-base leading-none transition-transform group-open:rotate-180">
                  ▾
                </span>
              </div>
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {hasCafes ? (
                list.map((c: CafeItem) => {
                  const key = typeof c === "object" && c ? (c.id ?? c.name ?? String(c)) : String(c);
                  const label = typeof c === "object" && c && "name" in c ? c.name : String(c);
                  const idOrName = typeof c === "object" && c && "id" in c ? (c as { id: string }).id : label;
                  const clickable = Boolean(onOpenCafe);
                  const safeIdOrName = (idOrName ?? "").toString().trim();
                  const canClick = Boolean(clickable && safeIdOrName && onOpenCafe);
                  const Wrapper = clickable ? "button" : "span";
                  const chipClass =
                    "inline-flex items-center rounded-full border border-[rgba(15,23,42,0.15)] bg-white/70 px-2.5 py-1 text-xs text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-1 " +
                    (clickable ? "cursor-pointer hover:bg-white/90" : "cursor-default");
                  return (
                    <Wrapper
                      key={key}
                      type={clickable ? "button" : undefined}
                      onClick={canClick ? () => onOpenCafe!(safeIdOrName) : undefined}
                      className={chipClass}
                    >
                      {label}
                    </Wrapper>
                  );
                })
              ) : (
                <div className="text-sm text-slate-600">
                  Te esperamos en cafeterías adheridas.
                </div>
              )}
            </div>
          </details>
        </div>

        {/* Footer abajo */}
        <div className="mt-auto pt-4">
          <Button
            className="w-full"
            variant="primary"
            size="md"
            type="button"
            onClick={onDiscoverClick}
          >
            Descubrir
          </Button>
        </div>
      </div>
    </Card>
  );
}

type CafeLike = { name?: string | null; image_code?: string | number | null };

export function CafeCard({
  cafe,
  image,
  tag,
  fallbackImage = DEFAULT_COVER,
  debugLabel,
}: {
  cafe: CafeLike;
  image: string;
  tag?: string;
  fallbackImage?: string;
  /** Solo se muestra cuando NEXT_PUBLIC_MEDIA_DEBUG=1 */
  debugLabel?: string;
}) {
  const [src, setSrc] = useState(image);
  const handleError = () => setSrc(fallbackImage);

  return (
    <Card className="overflow-hidden p-0 hover:scale-[1.01] transition">
      <div className="relative h-32 w-full">
        <Image
          src={src}
          alt={cafe.name ? `Foto ${cafe.name}` : "Foto de cafetería"}
          fill
          className="object-cover"
          onError={handleError}
        />
      </div>
      {SHOW_MEDIA_DEBUG && debugLabel != null && (
        <div className="text-[10px] opacity-60 mt-1 break-all">{debugLabel}</div>
      )}
      <div className="p-4">
        <CardTitle>
          <CafeName cafe={cafe} />
        </CardTitle>
        {tag && <CardSubtitle>{tag}</CardSubtitle>}
      </div>
    </Card>
  );
}
