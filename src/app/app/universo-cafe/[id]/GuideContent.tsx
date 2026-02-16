"use client";

import Image from "next/image";
import { useEffect, useRef, useCallback } from "react";
import { upsertGuideView } from "@/app/actions/coffeeGuides";

type ContentBlock =
  | { type: "h2"; text?: string }
  | { type: "p"; text?: string }
  | { type: "text"; content?: string }
  | { type: "bullets"; items?: string[] }
  | { type: "image"; url?: string; alt?: string };

type ContentJson = { blocks?: ContentBlock[] };

type Props = {
  guideId: string;
  profileId: string;
  contentJson: Record<string, unknown>;
  initialProgress: number;
};

export default function GuideContent({ guideId, profileId, contentJson, initialProgress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef(initialProgress);
  const rafRef = useRef<number | null>(null);

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

  const blocks = (contentJson as ContentJson).blocks ?? [];

  return (
    <div ref={containerRef} className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
      {blocks.map((block, i) => {
        if (block.type === "h2" && block.text) {
          return (
            <h2 key={i} className="mt-6 text-base font-semibold text-neutral-900 first:mt-0">
              {block.text}
            </h2>
          );
        }
        if ((block.type === "p" && block.text) || (block.type === "text" && block.content)) {
          const text = block.type === "p" ? block.text : (block as { content?: string }).content;
          return (
            <p key={i} className="text-neutral-700 leading-relaxed">
              {text}
            </p>
          );
        }
        if (block.type === "bullets" && Array.isArray(block.items)) {
          return (
            <ul key={i} className="list-disc list-inside space-y-1 text-neutral-700">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "image" && block.url) {
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
        }
        return null;
      })}
    </div>
  );
}
