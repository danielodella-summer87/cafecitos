"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/actions/logout";
import type { ConsumerSummaryResult, ConsumerTx, CafeMapItem } from "@/app/actions/consumerSummary";
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

const BENEFIT_TARGET = 100;

type Props = {
  data: ConsumerSummaryResult;
};

function cafeName(cafeId: string | null, cafesMap: Record<string, CafeMapItem>): string {
  if (!cafeId) return "(sin cafetería)";
  return cafesMap[cafeId]?.name ?? "(sin cafetería)";
}

export default function ConsumerPanelClient({ data }: Props) {
  const params = useSearchParams();
  const debug = params.get("debug") === "1";

  const { session, balance, last10, generatedTotal, redeemedTotal, cafesMap } = data;
  const missing = Math.max(0, BENEFIT_TARGET - balance);
  const progressPct = Math.min(100, (balance / BENEFIT_TARGET) * 100);
  const tier = getMembershipTier(balance);
  const next = getNextTierInfo(balance);

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
          title="Cafecitos"
          subtitle="Tu universo de cafés, beneficios y experiencias."
          rightSlot={rightSlot}
        />

        {/* 3 cards arriba */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardSubtitle>Saldo de cafecitos</CardSubtitle>
            <p className="mt-2 text-3xl font-semibold text-[#0F172A]">☕ {balance}</p>
            <p className="mt-1 text-xs text-[#64748B]">disponibles</p>
          </Card>
          <Card>
            <CardSubtitle>Tu nivel</CardSubtitle>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${tier.dotClass}`} aria-hidden />
              <Badge variant="accent">{tier.name}</Badge>
            </div>
            {next.nextName && next.remaining > 0 ? (
              <p className="mt-2 text-sm text-[#64748B]">
                Faltan <strong className="text-[#0F172A]">{next.remaining}</strong> para {next.nextName}
              </p>
            ) : null}
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <PromoCard
              title="Desayuno 2x1"
              description="Solo esta semana en cafeterías adheridas."
              image="https://images.unsplash.com/photo-1509042239860-f550ce710b93"
              cta="Ver promos"
            />
            <PromoCard
              title="Happy Coffee"
              description="Cafecitos extra después de las 17hs."
              image="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"
              cta="Descubrir"
            />
          </div>
        </div>

        {/* Cafeterías cerca / explorá */}
        <div className="mt-6">
          <h2 className="mb-4 text-lg font-semibold text-[#0F172A]">Cafeterías cerca / explorá</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <CafeCard
              name="Amor Perfecto"
              tag="Especialidad"
              image="https://images.unsplash.com/photo-1559925393-8be0ec4767c8"
            />
            <CafeCard
              name="Cafe Nadia 2026"
              tag="Clásico"
              image="https://images.unsplash.com/photo-1511920170033-f8396924c348"
            />
          </div>
        </div>

        {/* Eventos */}
        <div className="mt-6">
          <Card>
            <CardTitle>Eventos esta semana</CardTitle>
            <CardSubtitle>Próximamente</CardSubtitle>
            <p className="mt-2 text-sm text-[#64748B]">Sin eventos programados</p>
          </Card>
        </div>

        {/* Bloque extra: próximo beneficio + generado/canjeado (mantener lógica existente) */}
        <Card className="mt-6">
          <CardTitle>Próximo beneficio</CardTitle>
          {missing === 0 ? (
            <p className="mt-2 font-medium text-[#16A34A]">¡Alcanzaste tu próximo café gratis!</p>
          ) : (
            <p className="mt-2 text-sm text-[#64748B]">
              Te faltan <strong className="text-[#0F172A]">{missing}</strong> cafecitos para tu próximo café gratis.
            </p>
          )}
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
            <div
              className="h-full rounded-full bg-[#16A34A] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[#64748B]">{Math.round(progressPct)}%</p>
        </Card>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Card>
            <CardSubtitle>Generado total</CardSubtitle>
            <p className="mt-1 text-2xl font-semibold text-[#16A34A]">+{generatedTotal}</p>
          </Card>
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
