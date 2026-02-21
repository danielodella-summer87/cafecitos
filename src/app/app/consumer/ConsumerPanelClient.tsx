"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Gift, ChevronDown } from "lucide-react";
import { logout } from "@/app/actions/logout";
import type { ConsumerSummaryResult, ConsumerTx, CafeMapItem } from "@/app/actions/consumerSummary";
import { redeemWelcomeGift } from "@/app/actions/consumerSummary";
import type { CafeListItem } from "@/app/actions/cafes";
import type { CoffeeGuide } from "@/app/actions/coffeeGuides";
import { getClientTiersForDisplay, type TierRow } from "@/app/actions/adminReports";
import { getTxMeta } from "@/lib/ui/txLabels";
import {
  Container,
  PageHeader,
  Card,
  CardTitle,
  CardSubtitle,
  Button,
} from "@/app/ui/components";
import { PromoCard, CafeCard } from "@/app/ui/media";
import { AppMark } from "@/components/brand/AppMark";
import CafeInfoModal from "./CafeInfoModal";
import LevelInfoModal from "./LevelInfoModal";

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
  guidesPreview?: CoffeeGuide[];
};

function cafeName(cafeId: string | null, cafesMap: Record<string, CafeMapItem>): string {
  if (!cafeId) return "(sin cafetería)";
  return cafesMap[cafeId]?.name ?? "(sin cafetería)";
}

/** Calcula nivel actual y siguiente por puntos (tiers ya ordenados por sort_order / min_points). */
function getTierByPoints(tiers: TierRow[], points: number): {
  currentTier: TierRow | null;
  nextTier: TierRow | null;
  remaining: number;
} {
  const pts = Number.isFinite(points) ? Math.max(0, points) : 0;
  if (!tiers.length) return { currentTier: null, nextTier: null, remaining: 0 };
  let current: TierRow = tiers[0];
  for (const t of tiers) {
    if (pts >= t.min_points) current = t;
  }
  const currentIndex = tiers.findIndex((t) => t.id === current.id);
  const nextTier = currentIndex >= 0 && currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  const remaining = nextTier ? Math.max(0, nextTier.min_points - pts) : 0;
  return { currentTier: current, nextTier, remaining };
}

export default function ConsumerPanelClient({ data, cafesList, guidesPreview = [] }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const debug = params.get("debug") === "1";
  const [openCafeId, setOpenCafeId] = useState<string | null>(null);
  const [openLevelInfo, setOpenLevelInfo] = useState(false);
  const [isCafesOpen, setCafesOpen] = useState(false);
  const [clientTiers, setClientTiers] = useState<TierRow[]>([]);

  useEffect(() => {
    let mounted = true;
    getClientTiersForDisplay().then((tiers) => {
      if (mounted) setClientTiers(tiers);
    });
    return () => { mounted = false; };
  }, []);

  const { session, balance, last10, generatedTotal, redeemedTotal, cafesMap, welcomeGiftRedeemed } = data;

  const [welcomeCode, setWelcomeCode] = useState("");
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [justRedeemed, setJustRedeemed] = useState(false);

  const { currentTier, nextTier, remaining: nextTierRemaining } = getTierByPoints(clientTiers, balance);
  const tierDisplayName = currentTier?.name ?? "—";
  const nextTierName = nextTier?.name ?? null;
  const progressToNext =
    nextTier && currentTier && nextTier.min_points > currentTier.min_points
      ? Math.min(100, (Math.max(0, balance - currentTier.min_points) / (nextTier.min_points - currentTier.min_points)) * 100)
      : 100;

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

  const greeting = session?.fullName?.trim() ? `Hola, ${session.fullName.trim()}` : "Hola 👋";

  return (
    <main>
      <Container>
        <PageHeader
          title={<AppMark className="text-2xl font-semibold tracking-tight text-[#0F172A]" iconSize={32} />}
          subtitle="Tu universo de cafés, beneficios y experiencias."
          rightSlot={rightSlot}
        />
        <p className="text-sm md:text-base text-slate-600 mt-1 mb-4">{greeting}</p>

        {justRedeemed && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <p className="font-medium text-green-800">¡Regalo activado! Sumamos 10 cafecitos a tu cuenta.</p>
            <p className="mt-2 text-sm text-green-700">Explorá promociones y cafeterías:</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => document.getElementById("seccion-promociones")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
              >
                Ver promociones
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("seccion-explorar")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
              >
                Explorar cafeterías
              </button>
            </div>
          </div>
        )}

        {!welcomeGiftRedeemed && !justRedeemed && (
          <Card className="mb-6 !bg-[#F6EFE6]">
            <CardTitle>Activar regalo de bienvenida</CardTitle>
            <CardSubtitle>Código recibido por WhatsApp (4 dígitos)</CardSubtitle>
            <Image
              src="/images/amor-perfecto-bolsa-250g.png"
              alt="Bolsa de café Amor Perfecto 250g"
              width={520}
              height={520}
              className="mt-3 w-full max-w-[240px] mx-auto rounded-xl shadow-sm"
              priority
            />
            <form
              className="mt-4 flex flex-wrap items-end gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setWelcomeError(null);
                setWelcomeLoading(true);
                const res = await redeemWelcomeGift(welcomeCode);
                setWelcomeLoading(false);
                if (res.ok) {
                  setJustRedeemed(true);
                  setWelcomeCode("");
                  router.refresh();
                } else {
                  setWelcomeError(res.message);
                }
              }}
            >
              <div className="flex-1 min-w-[120px]">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="0000"
                  value={welcomeCode}
                  onChange={(e) => setWelcomeCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500/40"
                  aria-label="Código recibido por WhatsApp (4 dígitos)"
                />
              </div>
              <Button
                type="submit"
                variant="danger"
                disabled={welcomeLoading || welcomeCode.length !== 4}
                className="inline-flex items-center justify-center gap-2"
              >
                <Gift className="h-4 w-4 text-white" />
                {welcomeLoading ? "Activando…" : "Activar"}
              </Button>
            </form>
            {welcomeError && <p className="mt-2 text-sm text-red-600">{welcomeError}</p>}
          </Card>
        )}

        {/* Primera fila: 25% izquierda (Saldo, Nivel, Próximo beneficio, Generado) + 75% derecha (carrusel promos) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* IZQUIERDA (25%) — Una card unificada: nivel + métricas */}
          <div className="md:col-span-3">
            <Card className="mb-4 !bg-[#F6EFE6] p-4 space-y-3">
              {/* FILA 1 — NIVEL */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">Tu nivel</span>
                  <span className="text-slate-400" aria-hidden>•</span>
                  <button
                    type="button"
                    onClick={() => setOpenLevelInfo(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-[#C0841A]/12 px-3 py-1 text-sm font-semibold text-[#B45309] border-[#C0841A]/25 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-1 hover:bg-[#C0841A]/20 transition-colors"
                    aria-label={`Ver información del nivel ${tierDisplayName}`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: currentTier?.dot_color ?? "#C0841A" }}
                      aria-hidden
                    />
                    {tierDisplayName}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {nextTier ? (
                    <>Faltan <strong className="text-slate-700">{nextTierRemaining}</strong> para <strong>{nextTierName}</strong></>
                  ) : (
                    <>¡Máximo nivel alcanzado!</>
                  )}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-full rounded-full bg-[#16A34A] transition-all"
                    style={{ width: `${progressToNext}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[13px] text-slate-500">
                  <span>{Math.round(progressToNext)}%</span>
                  {nextTier ? (
                    <span>Nivel {nextTier.badge_label ?? nextTier.name}</span>
                  ) : currentTier?.badge_message ? (
                    <span>{currentTier.badge_message}</span>
                  ) : null}
                </div>
              </div>

              {/* FILA 2 — MÉTRICAS (2 columnas) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Generado total</p>
                  <div className="mt-1 flex items-center gap-2">
                    <AppMark iconOnly iconSize={28} />
                    <span className="text-lg font-semibold text-[#0F172A]">{generatedTotal ?? 0}</span>
                  </div>
                  <p className="text-xs text-slate-500">acumulados</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Saldo disponible</p>
                  <div className="mt-1 flex items-center gap-2">
                    <AppMark iconOnly iconSize={28} />
                    <span className="text-lg font-semibold text-[#0F172A]">{balance ?? 0}</span>
                  </div>
                  <p className="text-xs text-slate-500">disponibles</p>
                </div>
              </div>
            </Card>

            {/* Acciones rápidas */}
            <Card className="mb-6 !bg-[#F6EFE6] p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Acciones rápidas</h3>
                <span className="text-[12px] text-slate-500">Atajos</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById("seccion-movimientos")?.scrollIntoView({ behavior: "smooth" })}
                  className="h-10 w-full rounded-xl text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Ver historial
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById("seccion-explorar")?.scrollIntoView({ behavior: "smooth" })}
                  className="h-10 w-full rounded-xl text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Explorar
                </button>
              </div>
            </Card>
          </div>

          {/* DERECHA (75%) - Carrusel promos */}
          <div id="seccion-promociones" className="md:col-span-9 scroll-mt-4">
            <Card className="!bg-[#F6EFE6] md:h-[420px] flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <CardTitle>Promociones</CardTitle>
                  <CardSubtitle>Beneficios disponibles en tus cafeterías.</CardSubtitle>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm transition"
                    onClick={onPrevPromo}
                    aria-label="Promo anterior"
                  >
                    <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm transition"
                    onClick={onNextPromo}
                    aria-label="Siguiente promo"
                  >
                    <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              {/* Contenedor scrolleable en desktop para emparejar altura con columna izquierda */}
              <div className="mt-3 flex-1 min-h-0 overflow-auto pr-1">
                <div
                  ref={promoScrollRef}
                  className="flex items-stretch gap-4 overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar"
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
              </div>
            </Card>
          </div>
        </div>

        {/* Cafeterías cerca / Explorar — colapsado por defecto */}
        <div id="seccion-explorar" className="mt-6 scroll-mt-4">
          <button
            type="button"
            onClick={() => setCafesOpen((o) => !o)}
            className="group flex w-full items-start justify-between gap-4 rounded-xl border border-[rgba(15,23,42,0.10)] bg-[#F6EFE6] p-4 text-left transition hover:bg-[#EDE6DC] focus:outline-none focus:ring-2 focus:ring-red-500/40"
            aria-expanded={isCafesOpen}
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">Explorar cafeterías</span>
              </div>
              <div className="mt-2">
                <div className="relative h-[72px] w-full overflow-hidden rounded-xl transition-all duration-300 ease-out">
                  <img
                    src="/images/banners/cafeterias-wide.png"
                    alt="Explorar cafeterías"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] contrast-[1.03] brightness-[1.02]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/banners/default-wide.png";
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-xl backdrop-blur-[1.5px] backdrop-saturate-[1.15] opacity-60"
                    aria-hidden
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/10" aria-hidden />
                  <div className="pointer-events-none absolute inset-0" aria-hidden>
                    <div className="absolute -top-6 left-0 right-0 h-16 bg-gradient-to-b from-white/40 via-white/15 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-60" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent" aria-hidden />
                </div>
              </div>
            </div>
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md ring-1 ring-black/5 ring-2 ring-white/70 transition-all duration-200 hover:scale-[1.04] hover:bg-red-700 active:scale-[0.96] active:bg-red-800"
              aria-hidden
            >
              <ChevronDown className={`h-5 w-5 text-white transition-transform duration-300 ${isCafesOpen ? "rotate-180" : ""}`} />
            </span>
          </button>
          {isCafesOpen && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
          )}
          <CafeInfoModal
            open={!!openCafeId}
            cafeId={openCafeId ?? ""}
            onClose={() => setOpenCafeId(null)}
            isAdmin={data.session.role === "admin"}
          />
          <LevelInfoModal
            open={openLevelInfo}
            onClose={() => setOpenLevelInfo(false)}
            tiers={clientTiers}
            tierSlug={currentTier?.slug ?? ""}
            points={balance}
          />
        </div>

        {/* Universo Café — colapsado por defecto */}
        <div className="mt-6">
          <Card className="!bg-[#F6EFE6] p-0 overflow-hidden">
            <details className="group">
              <summary className="group flex cursor-pointer list-none items-start justify-between gap-4 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 rounded-[1rem]">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <AppMark iconOnly iconSize={32} />
                    <span className="truncate text-base font-semibold text-slate-900">Universo Café</span>
                  </span>
                    <span className="shrink-0 text-sm text-slate-500">•</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-500">Recetas, métodos y preparaciones</span>
                  </div>
                  <div className="mt-2">
                    <div className="relative h-[72px] w-full overflow-hidden rounded-xl transition-all duration-300 ease-out">
                      <img
                        src="/images/banners/universo-cafe-wide.png"
                        alt="Universo Café"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] contrast-[1.03] brightness-[1.02]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/banners/default-wide.png";
                        }}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 rounded-xl backdrop-blur-[1.5px] backdrop-saturate-[1.15] opacity-60"
                        aria-hidden
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/10" aria-hidden />
                      <div className="pointer-events-none absolute inset-0" aria-hidden>
                        <div className="absolute -top-6 left-0 right-0 h-16 bg-gradient-to-b from-white/40 via-white/15 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-60" />
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent" aria-hidden />
                    </div>
                  </div>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md ring-1 ring-black/5 ring-2 ring-white/70 transition-all duration-200 hover:scale-[1.04] hover:bg-red-700 active:scale-[0.96] active:bg-red-800"
                  aria-label="Desplegar"
                >
                  <ChevronDown className="h-5 w-5 text-white transition-transform duration-300 group-open:rotate-180" />
                </span>
              </summary>
              <div className="border-t border-[rgba(15,23,42,0.10)] px-5 pb-5 pt-4">
                <p className="text-sm text-[#64748B] mb-4">
                  Guías de café, tipos, métodos de preparación y tips. Desbloqueá más contenido según tu nivel.
                </p>
                <Link
                  href="/app/universo-cafe"
                  className="inline-flex items-center justify-center h-10 px-4 rounded-full text-base font-semibold border border-[#C0841A]/25 bg-[#C0841A]/12 text-[#B45309] hover:bg-[#C0841A]/20 transition-colors"
                >
                  Abrir Universo Café
                </Link>
                {guidesPreview.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {guidesPreview.map((guide) => (
                      <Link
                        key={guide.id}
                        href={`/app/universo-cafe/${guide.id}`}
                        className="inline-flex items-center justify-center h-9 px-3 rounded-full text-sm font-medium border border-[rgba(15,23,42,0.15)] bg-white/80 text-[#0F172A] hover:bg-white transition-colors"
                      >
                        {guide.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </Card>
        </div>

        {/* Eventos — colapsado por defecto */}
        <div className="mt-6">
          <Card className="!bg-[#F6EFE6] p-0 overflow-hidden">
            <details className="group">
              <summary className="group flex cursor-pointer list-none items-start justify-between gap-4 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 rounded-[1rem]">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">Eventos esta semana</span>
                    <span className="shrink-0 text-sm text-slate-500">•</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-500">Próximamente</span>
                  </div>
                  <div className="mt-2">
                    <div className="relative h-[72px] w-full overflow-hidden rounded-xl transition-all duration-300 ease-out">
                      <img
                        src="/images/banners/eventos-wide.png"
                        alt="Eventos"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] contrast-[1.03] brightness-[1.02]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/banners/default-wide.png";
                        }}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 rounded-xl backdrop-blur-[1.5px] backdrop-saturate-[1.15] opacity-60"
                        aria-hidden
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/10" aria-hidden />
                      <div className="pointer-events-none absolute inset-0" aria-hidden>
                        <div className="absolute -top-6 left-0 right-0 h-16 bg-gradient-to-b from-white/40 via-white/15 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-60" />
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent" aria-hidden />
                    </div>
                  </div>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md ring-1 ring-black/5 ring-2 ring-white/70 transition-all duration-200 hover:scale-[1.04] hover:bg-red-700 active:scale-[0.96] active:bg-red-800"
                  aria-label="Desplegar"
                >
                  <ChevronDown className="h-5 w-5 text-white transition-transform duration-300 group-open:rotate-180" />
                </span>
              </summary>
              <div className="border-t border-[rgba(15,23,42,0.10)] px-5 pb-5 pt-4">
                <p className="text-sm text-[#64748B]">Sin eventos programados</p>
              </div>
            </details>
          </Card>
        </div>

        {/* Canjeado total — colapsado por defecto */}
        <div className="mt-6">
          <Card className="!bg-[#F6EFE6] p-0 overflow-hidden">
            <details className="group">
              <summary className="group flex cursor-pointer list-none items-start justify-between gap-4 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 rounded-[1rem]">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">Canjeado total</span>
                    <span className="shrink-0 text-sm text-slate-500">•</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-orange-600">−{redeemedTotal}</span>
                  </div>
                  <div className="mt-2">
                    <div className="relative h-[72px] w-full overflow-hidden rounded-xl transition-all duration-300 ease-out">
                      <img
                        src="/images/banners/canjeado-wide.png"
                        alt="Canjeado total"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] contrast-[1.03] brightness-[1.02]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/images/banners/default-wide.png";
                        }}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 rounded-xl backdrop-blur-[1.5px] backdrop-saturate-[1.15] opacity-60"
                        aria-hidden
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/10" aria-hidden />
                      <div className="pointer-events-none absolute inset-0" aria-hidden>
                        <div className="absolute -top-6 left-0 right-0 h-16 bg-gradient-to-b from-white/40 via-white/15 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-60" />
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent" aria-hidden />
                    </div>
                  </div>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md ring-1 ring-black/5 ring-2 ring-white/70 transition-all duration-200 hover:scale-[1.04] hover:bg-red-700 active:scale-[0.96] active:bg-red-800"
                  aria-label="Desplegar"
                >
                  <ChevronDown className="h-5 w-5 text-white transition-transform duration-300 group-open:rotate-180" />
                </span>
              </summary>
              <div className="border-t border-[rgba(15,23,42,0.10)] px-5 pb-5 pt-4">
                <p className="text-2xl font-semibold text-orange-600">−{redeemedTotal}</p>
              </div>
            </details>
          </Card>
        </div>

        {/* Últimos movimientos */}
        <div id="seccion-movimientos" className="scroll-mt-4">
          <Card className="mt-6">
          <details className="group">
            <summary className="group flex cursor-pointer list-none items-start justify-between gap-4 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 rounded-[1rem]">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <AppMark iconOnly iconSize={32} />
                  <span className="truncate text-base font-semibold text-slate-900">Últimos movimientos</span>
                </span>
                </div>
                <div className="mt-2">
                  <div className="relative h-[72px] w-full overflow-hidden rounded-xl transition-all duration-300 ease-out">
                    <img
                      src="/images/banners/movimientos-wide.png"
                      alt="Últimos movimientos"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] contrast-[1.03] brightness-[1.02]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/images/banners/default-wide.png";
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 rounded-xl backdrop-blur-[1.5px] backdrop-saturate-[1.15] opacity-60"
                      aria-hidden
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/10" aria-hidden />
                    <div className="pointer-events-none absolute inset-0" aria-hidden>
                      <div className="absolute -top-6 left-0 right-0 h-16 bg-gradient-to-b from-white/40 via-white/15 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-60" />
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent" aria-hidden />
                  </div>
                </div>
              </div>
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md ring-1 ring-black/5 ring-2 ring-white/70 transition-all duration-200 hover:scale-[1.04] hover:bg-red-700 active:scale-[0.96] active:bg-red-800"
                aria-label="Desplegar"
              >
                <ChevronDown className="h-5 w-5 text-white transition-transform duration-300 group-open:rotate-180" />
              </span>
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
        </div>

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
        <p className={`flex items-center gap-1.5 text-sm font-medium ${meta.color}`}>
          {meta.icon === "logo" ? <AppMark iconOnly iconSize={28} /> : meta.icon}{" "}
          {meta.label}
        </p>
        <p className="text-sm text-[#64748B]">{cafeLabel}</p>
        <p className="text-sm text-[#64748B]">
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
