"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/actions/logout";
import type { ConsumerSummaryResult, ConsumerTx, CafeMapItem } from "@/app/actions/consumerSummary";
import type { CafeListItem } from "@/app/actions/cafes";
import { getTxMeta } from "@/lib/ui/txLabels";
import { getMembershipTier, getNextTierInfo } from "@/lib/ui/membership";
import {
  Container,
  PageHeader,
  Card,
  CardTitle,
  CardSubtitle,
  Button,
  Badge,
} from "@/app/ui/components";
import { PromoCard, CafeCard } from "@/app/ui/media";
import AppName from "@/app/ui/AppName";
import CafeInfoModal from "./CafeInfoModal";

const BENEFIT_TARGET = 100;

const PROMOS_MOCK: Array<{ id: string; image: string; title: string; description: string; cafes: string[] }> = [
  { id: "1", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93", title: "Desayuno 2x1", description: "Solo esta semana en cafeterías adheridas.", cafes: ["Portofino", "Gastolandia"] },
  { id: "2", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085", title: "Happy Coffee", description: "Cafecitos extra después de las 17hs.", cafes: ["Amor Perfecto", "Cafe Nadia 2026"] },
  { id: "3", image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31", title: "Torta + café", description: "Combo torta y café a precio especial.", cafes: ["Portofino", "Gastolandia", "Amor Perfecto"] },
  { id: "4", image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb", title: "Martes de descuento", description: "20% en preparaciones con leche.", cafes: ["Cafe Nadia 2026"] },
  { id: "5", image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf", title: "Viernes de regalo", description: "Un cafecito de cortesía cada viernes.", cafes: ["Portofino", "Amor Perfecto", "Gastolandia"] },
  { id: "6", image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd", title: "Combo merienda", description: "Medialuna + café a precio único.", cafes: ["Gastolandia", "Cafe Nadia 2026"] },
];

type Props = {
  data: ConsumerSummaryResult;
  cafesList: CafeListItem[];
};

function cafeName(cafeId: string | null, cafesMap: Record<string, CafeMapItem>): string {
  if (!cafeId) return "(sin cafetería)";
  return cafesMap[cafeId]?.name ?? "(sin cafetería)";
}

export default function ConsumerPanelClient({ data, cafesList }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const debug = params.get("debug") === "1";
  const [openCafeId, setOpenCafeId] = useState<string | null>(null);

  const { session, balance, last10, generatedTotal, redeemedTotal, cafesMap } = data;
  const missing = Math.max(0, BENEFIT_TARGET - balance);
  const progressPct = Math.min(100, (balance / BENEFIT_TARGET) * 100);
  const tier = getMembershipTier(balance);
  const next = getNextTierInfo(balance);

  const promos = PROMOS_MOCK;
  const promoScrollRef = useRef<HTMLDivElement>(null);

  function onPrevPromo() {
    const el = promoScrollRef.current;
    if (!el) return;
    const step = el.clientWidth;
    el.scrollBy({ left: -step, behavior: "smooth" });
  }
  function onNextPromo() {
    const el = promoScrollRef.current;
    if (!el) return;
    const step = el.clientWidth;
    el.scrollBy({ left: step, behavior: "smooth" });
  }
  function onDiscoverPromo(_p: (typeof promos)[0]) {
    router.push("/app/universo-cafe");
  }

  /** Abre el modal de ficha de cafetería por id o por nombre (resuelve con cafesList). */
  function handleOpenCafe(idOrName: string) {
    const byId = cafesList.find((c) => c.id === idOrName);
    if (byId) {
      setOpenCafeId(byId.id);
      return;
    }
    const byName = cafesList.find((c) => c.name === idOrName);
    if (byName) {
      setOpenCafeId(byName.id);
      return;
    }
    setOpenCafeId(idOrName);
  }

  const rightSlot = (
    <form action={logout}>
      <Button type="submit" variant="danger" size="sm">
        Salir
      </Button>
    </form>
  );

  return (
    <main>
      <Container>
        <PageHeader
          title={<AppName className="text-2xl font-semibold tracking-tight text-[#0F172A]" />}
          subtitle="Tu universo de cafés, beneficios y experiencias."
          rightSlot={rightSlot}
        />

        {/* Primera fila: 25% izquierda (Saldo, Nivel, Próximo beneficio, Generado) + 75% derecha (carrusel promos) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* IZQUIERDA (25%) */}
          <div className="md:col-span-3">
            <div className="space-y-4">
              <Card className="!bg-[#F6EFE6]">
                <CardTitle>Saldo disponible</CardTitle>
                <div className="mt-3 flex items-end gap-3">
                  <div className="text-3xl font-semibold text-[#0F172A]">☕ {balance ?? 0}</div>
                  <div className="text-sm text-slate-600 pb-1">disponibles</div>
                </div>
              </Card>

              <Card className="!bg-[#F6EFE6]">
                <CardTitle>Tu nivel</CardTitle>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${tier.dotClass}`} aria-hidden />
                  <Badge variant="accent">{tier.name}</Badge>
                </div>
                {next.nextName && next.remaining > 0 ? (
                  <div className="mt-2 text-sm text-slate-600">
                    Faltan <strong className="text-[#0F172A]">{next.remaining}</strong> para {next.nextName}
                  </div>
                ) : null}
              </Card>

              <Card className="!bg-[#F6EFE6]">
                <CardTitle>Próximo beneficio</CardTitle>
                <div className="mt-2 text-sm text-slate-700">
                  {missing === 0 ? (
                    <p className="font-medium text-[#16A34A]">¡Alcanzaste tu próximo café gratis!</p>
                  ) : (
                    <>
                      <p>Te faltan <strong>{missing}</strong> cafecitos para tu próximo café gratis.</p>
                      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                        <div
                          className="h-full rounded-full bg-[#16A34A] transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{Math.round(progressPct)}%</p>
                    </>
                  )}
                </div>
              </Card>

              <Card className="!bg-[#F6EFE6]">
                <CardTitle>Generado total</CardTitle>
                <div className="mt-3 text-2xl font-semibold text-[#0F172A]">
                  ☕ {generatedTotal ?? 0}
                </div>
                <div className="mt-1 text-sm text-slate-600">acumulados</div>
              </Card>
            </div>
          </div>

          {/* DERECHA (75%) - Carrusel promos */}
          <div className="md:col-span-9">
            <Card className="!bg-[#F6EFE6]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Promociones</CardTitle>
                  <CardSubtitle>Beneficios disponibles en tus cafeterías.</CardSubtitle>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-[rgba(15,23,42,0.1)] px-3 py-2 text-sm hover:bg-white/40 transition-colors"
                    onClick={onPrevPromo}
                    aria-label="Promo anterior"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[rgba(15,23,42,0.1)] px-3 py-2 text-sm hover:bg-white/40 transition-colors"
                    onClick={onNextPromo}
                    aria-label="Siguiente promo"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Carrusel promos: scroll-snap responsive */}
              <div
                ref={promoScrollRef}
                className="mt-4 flex items-stretch gap-4 overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar"
              >
                {promos.map((p) => (
                  <div
                    key={p.id}
                    className="snap-start shrink-0 w-[85vw] sm:w-[48vw] lg:w-[32vw] xl:w-[24vw]"
                  >
                    <PromoCard
                      image={p.image}
                      title={p.title}
                      description={p.description}
                      cafes={p.cafes}
                      onDiscoverClick={() => onDiscoverPromo(p)}
                      onOpenCafe={handleOpenCafe}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Cafeterías cerca / explorá */}
        <div className="mt-6">
          <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Cafeterías cerca / explorá</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {cafesList.length === 0 ? (
              <p className="text-sm text-slate-600">Próximamente más cafeterías.</p>
            ) : (
              cafesList.map((cafe) => (
                <div key={cafe.id} className="flex flex-col gap-3">
                  <CafeCard
                    cafe={{ name: cafe.name, image_code: cafe.image_code }}
                    tag={cafe.is_active ? "Activa" : "Inactiva"}
                    image={cafe.image_code ? `/media/cafes/${String(cafe.image_code).padStart(2, "0")}.jpg` : "/media/cover-default.jpg"}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full sm:w-auto"
                    type="button"
                    onClick={() => setOpenCafeId(cafe.id)}
                  >
                    Ver info
                  </Button>
                </div>
              ))
            )}
          </div>
          <CafeInfoModal
            open={!!openCafeId}
            cafeId={openCafeId ?? ""}
            onClose={() => setOpenCafeId(null)}
          />
        </div>

        {/* Eventos */}
        <div className="mt-6">
          <Card>
            <CardTitle>Eventos esta semana</CardTitle>
            <CardSubtitle>Próximamente</CardSubtitle>
            <p className="mt-2 text-sm text-[#64748B]">Sin eventos programados</p>
          </Card>
        </div>

        {/* Canjeado total (Generado está en la columna izquierda) */}
        <div className="mt-6">
          <Card>
            <CardSubtitle>Canjeado total</CardSubtitle>
            <p className="mt-1 text-2xl font-semibold text-orange-600">−{redeemedTotal}</p>
          </Card>
        </div>

        {/* Últimos movimientos */}
        <Card className="mt-6">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span aria-hidden>☕</span>
                <CardTitle className="!mt-0">Últimos movimientos</CardTitle>
              </div>
              <span className="text-xs text-[#64748B] group-open:hidden">Mostrar</span>
              <span className="text-xs text-[#64748B] hidden group-open:inline">Ocultar</span>
            </summary>
            <div className="mt-4 space-y-2 border-t border-[rgba(15,23,42,0.10)] pt-4">
              {last10.length === 0 ? (
                <p className="text-sm text-[#64748B]">Sin movimientos todavía</p>
              ) : (
                <ul className="space-y-2">
                  {last10.map((t) => (
                    <MovementRow key={t.id} tx={t} profileId={session.profileId} cafesMap={cafesMap} />
                  ))}
                </ul>
              )}
            </div>
          </details>
        </Card>

        {debug && (
          <div className="mt-6 rounded-xl border border-[rgba(15,23,42,0.10)] bg-[#F8FAFC] p-4">
            <div className="mb-2 font-semibold">DEBUG</div>
            <pre className="overflow-auto whitespace-pre-wrap text-xs">
              {JSON.stringify(
                {
                  session,
                  balance,
                  last10: last10.map((t) => ({ id: t.id, cafe_id: t.cafe_id })),
                  cafesMap,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </Container>
    </main>
  );
}

function MovementRow({
  tx,
  profileId,
  cafesMap,
}: {
  tx: ConsumerTx;
  profileId: string;
  cafesMap: Record<string, CafeMapItem>;
}) {
  const isIn = tx.to_profile_id === profileId;
  const sign = isIn ? "+" : "−";
  const meta = getTxMeta(tx.tx_type);
  const cafeLabel = cafeName(tx.cafe_id, cafesMap);
  const dateStr = tx.created_at
    ? new Date(tx.created_at).toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "";

  return (
    <li className="flex items-center justify-between gap-4 border-b border-[rgba(15,23,42,0.06)] py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${meta.color}`}>
          {meta.icon} {meta.label}
        </p>
        <p className="text-sm text-[#64748B]">{cafeLabel}</p>
        <p className="text-xs text-[#64748B]">
          {tx.note ?? "—"} · {dateStr}
        </p>
      </div>
      <span
        className={`whitespace-nowrap font-semibold ${isIn ? "text-[#16A34A]" : "text-orange-600"}`}
      >
        {sign}{tx.amount}
      </span>
    </li>
  );
}
