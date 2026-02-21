"use client";

import { useEffect } from "react";
import { AppMark } from "@/components/brand/AppMark";
import type { TierRow } from "@/app/actions/adminReports";
import { Button } from "@/app/ui/components";

type LevelInfoModalProps = {
  open: boolean;
  onClose: () => void;
  /** Tiers del sistema (misma fuente que admin), ordenados por sort_order. */
  tiers: TierRow[];
  /** Slug del nivel actual del cliente (viene de profiles.tier_id → tiers.slug). */
  tierSlug: string;
  points: number;
};

export default function LevelInfoModal({ open, onClose, tiers, tierSlug, points }: LevelInfoModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  const currentIndex = tiers.findIndex((t) => t.slug === tierSlug);
  const currentTier = currentIndex >= 0 ? tiers[currentIndex] : null;
  const nextTier = currentIndex >= 0 && currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  const displayName = currentTier?.name ?? tierSlug;
  const description = (currentTier?.badge_message ?? "").trim() || "Beneficios según tu nivel en el programa.";
  const remaining = nextTier ? Math.max(0, nextTier.min_points - points) : 0;
  const progressToNext =
    nextTier && currentTier && nextTier.min_points > currentTier.min_points
      ? Math.min(100, (Math.max(0, points - currentTier.min_points) / (nextTier.min_points - currentTier.min_points)) * 100)
      : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-info-title"
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-[#F6EFE6] shadow-xl animate-[fadeInScale_.25s_ease-out] border border-[rgba(15,23,42,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[rgba(15,23,42,0.1)] bg-[#F6EFE6] px-6 py-4">
          <h2 id="level-info-title" className="text-xl font-semibold text-[#0F172A]">
            <><AppMark iconOnly iconSize={18} /> Tu nivel: {displayName}</>
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Descripción (badge_message del tier) */}
          <section>
            <p className="text-sm text-slate-700">{description}</p>
          </section>

          {/* Progreso al siguiente nivel */}
          {nextTier && remaining > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Progreso hacia {nextTier.name}</h3>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                <div
                  className="h-full rounded-full bg-[#16A34A] transition-all duration-300"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Te faltan <strong>{remaining}</strong> cafecitos · {Math.round(progressToNext)}%
              </p>
            </section>
          )}

          {/* Roadmap de niveles (reales del sistema, orden por sort_order) */}
          <section>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Niveles del sistema</h3>
            <div className="space-y-2">
              {tiers.map((t) => {
                const isActive = t.slug === tierSlug;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      isActive
                        ? "border-red-600/50 bg-white/80 font-medium text-[#0F172A]"
                        : "border-[rgba(15,23,42,0.1)] bg-white/40 text-slate-700"
                    }`}
                  >
                    <span className="text-base shrink-0" aria-hidden>•</span>
                    <div className="flex items-baseline gap-2 min-w-0 flex-1">
                      <span className="font-medium">{t.name}</span>
                      {t.badge_message ? (
                        <span className="text-slate-500">({t.badge_message})</span>
                      ) : null}
                      <span className="text-slate-400 text-sm">
                        (desde {t.min_points} cafecitos)
                      </span>
                    </div>
                    {isActive && (
                      <span className="ml-auto text-sm font-semibold text-red-600 shrink-0">(activo)</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Cerrar */}
          <div className="pt-2">
            <Button type="button" variant="danger" className="w-full sm:w-auto" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
