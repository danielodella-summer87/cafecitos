"use client";

import { useEffect } from "react";
import {
  MEMBERSHIP_TIERS,
  getMembershipTier,
  getNextTierInfo,
  type MembershipTier,
} from "@/lib/ui/membership";
import { Button } from "@/app/ui/components";

const BENEFITS_BY_KEY: Record<MembershipTier["key"], string[]> = {
  bronce: [
    "Sumás 1 cafecito por compra",
    "Acceso al programa de beneficios",
    "Podés canjear cuando llegues a 100",
  ],
  plata: [
    "Sumás más cafecitos por compra",
    "Promociones exclusivas",
    "Acelerás camino al siguiente nivel",
  ],
  oro: [
    "Cafecitos extra en cada visita",
    "Descuentos en combos",
    "Acceso anticipado a promos",
  ],
  reserva: [
    "Beneficios exclusivos",
    "Eventos reservados",
    "Experiencia premium",
  ],
  leyenda: [
    "Generás más cafecitos por compra",
    "Acceso anticipado a promos",
    "Eventos exclusivos y sorpresas especiales",
  ],
};

type LevelInfoModalProps = {
  open: boolean;
  onClose: () => void;
  level: string;
  points: number;
};

export default function LevelInfoModal({ open, onClose, level, points }: LevelInfoModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  const tier = getMembershipTier(points);
  const next = getNextTierInfo(points);
  const benefits = BENEFITS_BY_KEY[tier.key] ?? [];
  const progressToNext =
    tier.nextMin != null && tier.nextMin > tier.min
      ? Math.min(100, (Math.max(0, points - tier.min) / (tier.nextMin - tier.min)) * 100)
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
            ☕ Tu nivel: {tier.name}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Descripción */}
          <section>
            <p className="text-sm text-slate-700">{tier.tagline}</p>
          </section>

          {/* Beneficios */}
          <section>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Beneficios de este nivel</h3>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700">
              {benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>

          {/* Progreso al siguiente nivel */}
          {next.nextName && next.remaining > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Progreso hacia {next.nextName}</h3>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                <div
                  className="h-full rounded-full bg-[#16A34A] transition-all duration-300"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Te faltan <strong>{next.remaining}</strong> cafecitos · {Math.round(progressToNext)}%
              </p>
            </section>
          )}

          {/* Roadmap de niveles */}
          <section>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Niveles del sistema</h3>
            <div className="space-y-2">
              {MEMBERSHIP_TIERS.map((t) => {
                const isActive = t.key === tier.key;
                return (
                  <div
                    key={t.key}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      isActive
                        ? "border-red-600/50 bg-white/80 font-medium text-[#0F172A]"
                        : "border-[rgba(15,23,42,0.1)] bg-white/40 text-slate-700"
                    }`}
                  >
                    <span className="text-base" aria-hidden>{t.emoji}</span>
                    <span>{t.name}</span>
                    {isActive && (
                      <span className="ml-auto text-xs font-semibold text-red-600">(activo)</span>
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
