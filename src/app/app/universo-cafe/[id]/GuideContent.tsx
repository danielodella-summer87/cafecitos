"use client";

import Image from "next/image";
import { useEffect, useRef, useCallback } from "react";
import { upsertGuideView } from "@/app/actions/coffeeGuides";
import { normalizeCoffeeContent, type CoffeeBlock } from "@/lib/coffeeContent";
import { getGuideCover, GENERIC_COVER } from "@/lib/universoCafeCovers";
import { AppMark } from "@/components/brand/AppMark";

const SECTION_STYLES: Record<string, { icon: string; box: string }> = {
  neutral: { icon: "logo", box: "bg-gray-50 border-gray-200 text-gray-900" },
  info: { icon: "ℹ️", box: "bg-blue-50 border-blue-200 text-blue-900" },
  tip: { icon: "💡", box: "bg-yellow-50 border-yellow-200 text-yellow-900" },
  warning: { icon: "⚠️", box: "bg-orange-50 border-orange-200 text-orange-900" },
  pro: { icon: "✨", box: "bg-violet-50 border-violet-200 text-violet-900" },
};

const CALLOUT_STYLES: Record<string, string> = {
  tip: "bg-yellow-50 border-yellow-200 text-yellow-900",
  warning: "bg-orange-50 border-orange-200 text-orange-900",
  pro: "bg-violet-50 border-violet-200 text-violet-900",
  info: "bg-blue-50 border-blue-200 text-blue-900",
};

type Props = {
  title: string;
  excerpt?: string | null;
  coverUrl?: string | null;
  slug: string;
  contentJson: Record<string, unknown>;
  guideId: string;
  profileId: string;
  initialProgress: number;
};

export default function GuideContent({
  title,
  excerpt,
  coverUrl,
  slug,
  contentJson,
  guideId,
  profileId,
  initialProgress,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef(initialProgress);
  const rafRef = useRef<number | null>(null);

  const coverSrc = getGuideCover({ cover_url: coverUrl, slug, title });

  const content = normalizeCoffeeContent(contentJson);
  const blocks = content.blocks;

  const saveProgress = useCallback(
    async (progressPct: number) => {
      if (progressPct === lastSavedRef.current) return;
      lastSavedRef.current = progressPct;
      await upsertGuideView(profileId, guideId, {
        progress_pct: Math.min(100, Math.max(0, progressPct)),
        completed_at: progressPct >= 100 ? new Date().toISOString() : null,
      });
    },
    [profileId, guideId]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const { scrollTop, scrollHeight, clientHeight } = el;
        const maxScroll = scrollHeight - clientHeight;
        const pct = maxScroll <= 0 ? 100 : Math.round((scrollTop / maxScroll) * 100);
        saveProgress(pct);
      });
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    const pct = maxScroll <= 0 ? 100 : Math.round((scrollTop / maxScroll) * 100);
    saveProgress(pct);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [saveProgress]);

  function renderBlock(block: CoffeeBlock, i: number) {
    switch (block.type) {
      case "section": {
        const variant = block.variant ?? "neutral";
        const style = SECTION_STYLES[variant] ?? SECTION_STYLES.neutral;
        const icon = block.icon ?? style.icon;
        return (
          <div
            key={i}
            className={`mt-4 rounded-2xl border px-4 py-3 first:mt-0 ${style.box}`}
          >
            <div className="flex items-center gap-2 font-semibold text-lg">
              {icon === "logo" ? <AppMark iconOnly iconSize={18} /> : <span>{icon}</span>}
              <span>{block.title}</span>
            </div>
          </div>
        );
      }
      case "p": {
        const text = block.text ?? "";
        const lower = text.toLowerCase();
        if (lower.includes("tip")) {
          return (
            <div
              key={i}
              className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 my-3 text-sm"
            >
              💡 {text}
            </div>
          );
        }
        if (lower.includes("error")) {
          return (
            <div
              key={i}
              className="bg-orange-50 border border-orange-200 rounded-xl p-3 my-3 text-sm"
            >
              ⚠️ {text}
            </div>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed mb-3 text-gray-700">
            {text}
          </p>
        );
      }
      case "bullets":
        return (
          <ul key={i} className="space-y-1 mb-4">
            {block.items?.map((it: string, idx: number) => (
              <li key={idx} className="text-sm flex gap-2">
                ✅ <span>{it}</span>
              </li>
            ))}
          </ul>
        );
      case "checklist":
        return (
          <ul key={i} className="mt-2 space-y-2">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2 text-[15px] leading-6 text-gray-700">
                <span className="mt-[2px] shrink-0">☑️</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        );
      case "steps":
        return (
          <ol key={i} className="mt-2 space-y-3">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-3 text-[15px] leading-6 text-gray-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">
                  {j + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        );
      case "callout": {
        const box = CALLOUT_STYLES[block.variant] ?? CALLOUT_STYLES.info;
        return (
          <div key={i} className={`mt-4 rounded-2xl border px-4 py-3 ${box}`}>
            {block.title ? (
              <p className="font-semibold">{block.title}</p>
            ) : null}
            <p className="mt-1 text-[15px] leading-6">{block.text}</p>
          </div>
        );
      }
      case "quote":
        return (
          <blockquote
            key={i}
            className="mt-4 border-l-4 border-neutral-300 pl-4 italic text-gray-700"
          >
            <p className="text-[15px] leading-6">"{block.text}"</p>
            {block.author ? (
              <cite className="mt-1 block text-sm text-gray-500">— {block.author}</cite>
            ) : null}
          </blockquote>
        );
      case "divider":
        return <hr key={i} className="my-5 border-neutral-200" />;
      case "image":
        if (!block.url) return null;
        return (
          <div key={i} className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-200">
            <Image
              src={block.url}
              alt={block.alt ?? ""}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <>
      {/* Hero image */}
      <div className="mb-4 overflow-hidden rounded-2xl border bg-neutral-100">
        <img
          src={coverSrc}
          alt={title}
          className="w-full h-[220px] object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.endsWith(GENERIC_COVER)) return;
            img.src = GENERIC_COVER;
          }}
        />
      </div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
        {excerpt ? <p className="mt-1 text-sm text-gray-600">{excerpt}</p> : null}
      </div>

      {/* Contenido premium con scroll y progreso */}
      <div ref={containerRef} className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
        {blocks.map((block, i) => renderBlock(block, i))}
      </div>
    </>
  );
}
