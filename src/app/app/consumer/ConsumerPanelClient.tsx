"use client";

import { useSearchParams } from "next/navigation";
import { logout } from "@/app/actions/logout";
import type { ConsumerSummaryResult, ConsumerTx } from "@/app/actions/consumerSummary";
import { getTxMeta } from "@/lib/ui/txLabels";

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
    <main className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">
              Hola, {session.fullName ?? "Consumidor"}
            </h1>
            <p className="text-sm text-neutral-500">Tu panel de cafecitos</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100"
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

        {/* Últimos movimientos: nombre cafetería + nota + fecha + monto (signo y color) */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Últimos movimientos</h2>
          {last10.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin movimientos todavía</p>
          ) : (
            <ul className="space-y-3">
              {last10.map((t) => (
                <MovementRow key={t.id} tx={t} profileId={session.profileId} cafesMap={cafesMap} />
              ))}
            </ul>
          )}
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
