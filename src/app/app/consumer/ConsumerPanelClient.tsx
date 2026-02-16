"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions/logout";
import type { ConsumerSummaryResult, ConsumerTx } from "@/app/actions/consumerSummary";
import { getTxMeta } from "@/lib/ui/txLabels";
import { getMembershipTier, getNextTierInfo } from "@/lib/ui/membership";
import { PRO } from "@/lib/ui/pro";

const BENEFIT_TARGET = 100;

type Props = {
  data: ConsumerSummaryResult;
};

function cafeName(cafeId: string | null, cafesMap: Record<string, string>): string {
  if (!cafeId) return "(sin cafetería)";
  return cafesMap[cafeId] ?? "(sin cafetería)";
}

export default function ConsumerPanelClient({ data }: Props) {
  const params = useSearchParams();
  const debug = params.get("debug") === "1";

  const { session, balance, last10, generatedTotal, redeemedTotal, cafesMap } = data;
  const missing = Math.max(0, BENEFIT_TARGET - balance);
  const progressPct = Math.min(100, (balance / BENEFIT_TARGET) * 100);

  return (
    <main className={PRO.page}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logoamorperfecto.png"
              alt="Amor Perfecto"
              width={96}
              height={96}
              priority
              className="h-[4.5rem] w-auto"
            />

            <div>
              <h1 className="text-xl font-semibold text-black">
                Hola, {session.fullName ?? "Consumidor"}
              </h1>
              {/* Membresía */}
              {(() => {
                const tier = getMembershipTier(balance);
                const next = getNextTierInfo(balance);
                return (
                  <div className="mt-1 flex flex-col gap-1">
                    <div className="inline-flex items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tier.badgeClass}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${tier.dotClass}`} aria-hidden="true" />
                        <span>
                          {tier.name} · {tier.tagline}
                        </span>
                      </span>
                    </div>
                    {next.nextName && next.remaining > 0 ? (
                      <div className="text-xs text-neutral-600">
                        Te faltan <span className="font-semibold text-neutral-900">{next.remaining}</span> cafecitos para llegar a{" "}
                        <span className="font-semibold text-neutral-900">{next.nextName}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Salir
            </button>
          </form>
        </header>

        {/* Card principal: cafecitos disponibles */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
          <p className="text-4xl font-semibold">☕ {balance} cafecitos disponibles</p>
        </div>

        {/* Próximo beneficio (target 100) */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
          <h2 className="font-semibold mb-2">Próximo beneficio</h2>
          {missing === 0 ? (
            <p className="text-green-700 font-medium">¡Alcanzaste tu próximo café gratis!</p>
          ) : (
            <p className="text-neutral-600 mb-3">
              Te faltan <strong>{missing}</strong> cafecitos para tu próximo café gratis.
            </p>
          )}
          <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">{Math.round(progressPct)}%</p>
        </div>

        {/* Universo Café (modo Netflix: siempre entra, locks adentro) */}
        <Link
          href="/app/universo-cafe"
          className="block w-full mb-6 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-xl">☕</div>
            <div className="min-w-0">
              <div className="text-base font-semibold">Universo Café</div>
              <div className="mt-1 text-sm text-neutral-600">
                Descubrí tipos, métodos y preparaciones
              </div>
            </div>
          </div>
        </Link>

        {/* Generado total / Canjeado total */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Generado total</p>
            <p className="text-2xl font-semibold text-green-700">+{generatedTotal}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Canjeado total</p>
            <p className="text-2xl font-semibold text-orange-600">−{redeemedTotal}</p>
          </div>
        </div>

        {/* Últimos movimientos (colapsado por defecto) */}
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span aria-hidden>☕</span>
                <h3 className="text-sm font-semibold text-black">Últimos movimientos</h3>
              </div>
              <span className="text-xs text-black/60 group-open:hidden">Mostrar</span>
              <span className="text-xs text-black/60 hidden group-open:inline">Ocultar</span>
            </summary>

            <div className="mt-3 space-y-2">
              {last10.length === 0 ? (
                <p className="text-sm text-black/60">Sin movimientos todavía</p>
              ) : (
                <ul className="space-y-2">
                  {last10.map((t) => (
                    <MovementRow key={t.id} tx={t} profileId={session.profileId} cafesMap={cafesMap} />
                  ))}
                </ul>
              )}
            </div>
          </details>
        </div>

        {/* Debug ?debug=1 */}
        {debug && (
          <div className="mt-6 p-4 rounded-lg border border-neutral-300 bg-neutral-50">
            <div className="font-bold mb-2">DEBUG</div>
            <pre className="text-xs overflow-auto whitespace-pre-wrap">
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
      </div>
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
  cafesMap: Record<string, string>;
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
    <li className="flex items-center justify-between gap-4 py-2 border-b border-neutral-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${meta.color}`}>
          {meta.icon} {meta.label}
        </p>
        <p className="text-sm text-neutral-600">{cafeLabel}</p>
        <p className="text-xs text-neutral-500">
          {tx.note ?? "—"} · {dateStr}
        </p>
      </div>
      <span
        className={`font-semibold whitespace-nowrap ${isIn ? "text-green-700" : "text-orange-600"}`}
      >
        {sign}{tx.amount}
      </span>
    </li>
  );
}
