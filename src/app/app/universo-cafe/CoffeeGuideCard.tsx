"use client";

import Link from "next/link";
import { useState } from "react";
import type { CoffeeGuide } from "@/app/actions/coffeeGuides";
import UnlockModal from "./UnlockModal";

type Props = {
  guide: CoffeeGuide;
  isLocked: boolean;
  progressPct?: number;
  missingPoints?: number;
};

function normalizeCoverUrl(input?: string | null): string | null {
  if (!input) return null;
  const v = input.trim();
  if (!v) return null;

  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return v;
  if (v.startsWith("universo-cafe/")) return `/${v}`;
  return `/universo-cafe/${v}`;
}

export default function CoffeeGuideCard({ guide, isLocked, progressPct = 0, missingPoints }: Props) {
  const [showUnlock, setShowUnlock] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (isLocked) {
      e.preventDefault();
      setShowUnlock(true);
    }
  };

  const href = `/app/universo-cafe/${guide.id}`;

  const coverSrc =
    normalizeCoverUrl(guide.cover_url) ?? "/universo-cafe/cafe-filtrado-vs-espresso.png";

  return (
    <>
      <Link
        href={href}
        onClick={handleClick}
        className="group relative flex shrink-0 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 transition hover:border-neutral-300"
        style={{ width: "180px" }}
      >
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl bg-neutral-200">
          <img
            src={coverSrc}
            alt={guide.title}
            className={`h-full w-full object-cover ${isLocked ? "blur-sm scale-105" : ""}`}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "/universo-cafe/cafe-filtrado-vs-espresso.png";
            }}
          />
          {isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
              <span className="text-3xl" aria-hidden>
                🔒
              </span>
              <span className="mt-1 text-xs font-medium text-white">Pro / Leyenda</span>
            </div>
          )}
          {!isLocked && progressPct > 0 && progressPct < 100 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-400">
              <div
                className="h-full bg-green-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="line-clamp-2 text-sm font-medium text-neutral-900">{guide.title}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{guide.reading_minutes} min</p>
        </div>
      </Link>

      {showUnlock && (
        <UnlockModal
          minTierSlug={guide.min_tier_slug}
          missingPoints={missingPoints}
          onClose={() => setShowUnlock(false)}
        />
      )}
    </>
  );
}
