"use client";

import Link from "next/link";
import { useState } from "react";
import type { UniversoPageData } from "@/app/actions/coffeeGuides";
import HorizontalRail from "./HorizontalRail";
import { PRO } from "@/lib/ui/pro";

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  leyenda: "Leyenda",
};

const SECTION_CONFIG: { key: string; title: string; category: string }[] = [
  { key: "metodos", title: "Métodos", category: "metodos" },
  { key: "tipos", title: "Tipos", category: "tipos" },
  { key: "origenes", title: "Orígenes", category: "origenes" },
  { key: "premium", title: "Premium", category: "premium" },
];

type Props = {
  data: UniversoPageData;
};

export default function UniversoCafeClient({ data }: Props) {
  const [logoSrc, setLogoSrc] = useState<string | null>("/logoamoaperfecto.png");
  const [logoTriedFallback, setLogoTriedFallback] = useState(false);

  const { tierSlug, nextTierName, missingPoints, guides, viewsMap } = data;
  const tierName = TIER_LABELS[tierSlug] ?? tierSlug;

  let paraVos = guides
    .filter((g) => viewsMap[g.id] && (viewsMap[g.id].progress_pct > 0 || viewsMap[g.id].completed_at))
    .sort((a, b) => {
      const aV = viewsMap[a.id];
      const bV = viewsMap[b.id];
      const aT = aV?.completed_at ?? aV?.updated_at ?? "";
      const bT = bV?.completed_at ?? bV?.updated_at ?? "";
      return bT.localeCompare(aT);
    })
    .slice(0, 10);
  if (paraVos.length === 0) paraVos = guides.slice(0, 6);

  return (
    <main className={PRO.page}>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/app/consumer" className="text-sm text-neutral-600 hover:text-black">
            ← Volver al inicio
          </Link>
        </div>

        {/* Hero */}
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-3">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Amor Perfecto"
                width={72}
                height={72}
                style={{ width: 72, height: 72 }}
                className="shrink-0 rounded-xl object-contain"
                onError={() => {
                  if (!logoTriedFallback) {
                    setLogoTriedFallback(true);
                    setLogoSrc("/universo-cafe/logoamoaperfecto.png");
                    return;
                  }
                  setLogoSrc(null);
                }}
              />
            ) : (
              <div className="h-[72px] w-[72px] shrink-0 rounded-xl bg-gray-100" />
            )}
            <h1 className="text-2xl font-semibold text-neutral-900">Universo Café</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
              Tu nivel: {tierName}
            </span>
          </div>
          {nextTierName && missingPoints > 0 && (
            <p className="mt-3 text-sm text-neutral-600">
              Te faltan <strong>{missingPoints}</strong> cafecitos para llegar a {nextTierName}.
            </p>
          )}
        </div>

        {/* Rails */}
        <HorizontalRail
          title="Para vos"
          items={paraVos}
          userTierSlug={tierSlug}
          viewsMap={viewsMap}
          missingPoints={missingPoints}
        />
        {SECTION_CONFIG.filter((s) => s.category).map(({ key, title, category }) => (
          <HorizontalRail
            key={key}
            title={title}
            items={guides.filter((g) => g.category === category)}
            userTierSlug={tierSlug}
            viewsMap={viewsMap}
            missingPoints={missingPoints}
          />
        ))}
      </div>
    </main>
  );
}
