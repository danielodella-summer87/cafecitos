"use client";

import type { CoffeeGuide } from "@/app/actions/coffeeGuides";
import type { CoffeeGuideView } from "@/app/actions/coffeeGuides";
import { canAccess } from "@/lib/tierAccess";
import CoffeeGuideCard from "./CoffeeGuideCard";

type Props = {
  title: string;
  items: CoffeeGuide[];
  userTierSlug: string;
  viewsMap: Record<string, CoffeeGuideView>;
  missingPoints?: number;
};

export default function HorizontalRail({ title, items, userTierSlug, viewsMap, missingPoints }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {items.map((guide) => {
          const locked = !canAccess(userTierSlug, guide.min_tier_slug);
          const view = viewsMap[guide.id];
          const progressPct = view?.progress_pct ?? 0;
          return (
            <CoffeeGuideCard
              key={guide.id}
              guide={guide}
              isLocked={locked}
              progressPct={progressPct}
              missingPoints={missingPoints}
            />
          );
        })}
      </div>
    </section>
  );
}
