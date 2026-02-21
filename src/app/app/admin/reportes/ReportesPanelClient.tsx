"use client";

import Link from "next/link";
import { useState } from "react";
import type { KpisSummaryRow, CafeKpiRow, DailyKpiRow, TopClienteGlobalRow, AlertRow, PanelClienteGlobalRow } from "@/app/actions/adminReports";
import { AppMark } from "@/components/brand/AppMark";

function fmtInt(n: unknown) {
  const num = Number(n ?? 0);
  return Number.isFinite(num) ? num.toLocaleString("es-UY") : "0";
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: React.ReactNode;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
    </div>
  );
}

type Props = {
  kpisSummary: KpisSummaryRow;
  cafesReport: CafeKpiRow[];
  daily: DailyKpiRow[];
  topClientesGlobal: TopClienteGlobalRow[];
  alerts: AlertRow[];
  panelClientesGlobal: PanelClienteGlobalRow[];
  reportesLoadError?: string | null;
};

export default function ReportesPanelClient({
  kpisSummary: k,
  cafesReport: cafes,
  daily: days,
  topClientesGlobal: tops,
  alerts: al,
  panelClientesGlobal: panelClientes = [],
  reportesLoadError = null,
}: Props) {
  const [tab, setTab] = useState<"clientes" | "cafeterias">("clientes");

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/app/admin"
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition"
        >
          ← Volver a Admin
        </Link>
      </div>

      {reportesLoadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          ⚠️ {reportesLoadError}
        </div>
      ) : null}

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">📊 Panel de Decisiones</h1>
          <p className="text-sm text-gray-500">
            Clientes y cafeterías por separado.
          </p>
        </div>
        <div className="flex rounded-xl border overflow-hidden">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium ${tab === "clientes" ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
            onClick={() => setTab("clientes")}
          >
            Clientes
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium ${tab === "cafeterias" ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
            onClick={() => setTab("cafeterias")}
          >
            Cafeterías
          </button>
        </div>
      </div>

      {tab === "clientes" && (
        <div className="space-y-6">
          {/* PANEL CLIENTES (GLOBAL, SIN REPETIDOS) */}
          <section className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b font-semibold">👥 Panel Clientes (global)</div>
            <p className="p-4 pt-2 text-sm text-gray-500 border-b">
              Un cliente por fila. Movimientos = total histórico (earn+redeem). Cafetería preferida = donde más movió. Orden: neto desc.
            </p>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Cafetería preferida</th>
                  <th className="text-left p-3">Movimientos</th>
                  <th className="text-left p-3">Generado</th>
                  <th className="text-left p-3">Canjeado</th>
                  <th className="text-left p-3">Neto</th>
                </tr>
              </thead>
              <tbody>
                {panelClientes.map((r) => (
                  <tr key={r.cliente_id} className="border-t">
                    <td className="p-3 font-medium">
                      <Link
                        href={`/app/admin/clientes/${r.cliente_id}`}
                        className="text-gray-900 hover:text-amber-600 hover:underline transition"
                      >
                        {r.cliente}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-600">
                      {r.cafe_preferida_id ? (
                        <Link
                          href={`/app/admin/cafes/${r.cafe_preferida_id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {r.cafeteria_preferida}
                        </Link>
                      ) : (
                        r.cafeteria_preferida
                      )}
                    </td>
                    <td className="p-3">{fmtInt(r.movimientos)}</td>
                    <td className="p-3 text-green-600">{fmtInt(r.generado)}</td>
                    <td className="p-3 text-red-500">{fmtInt(r.canjeado)}</td>
                    <td className="p-3 font-semibold">{fmtInt(r.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* TOP CLIENTES (GLOBAL) — ÚLTIMOS 7 DÍAS */}
          <section className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b font-semibold">🏆 Top clientes (global) — últimos 7 días</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Cafetería</th>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Movimientos</th>
                  <th className="text-left p-3">Generado</th>
                  <th className="text-left p-3">Canjeado</th>
                  <th className="text-left p-3">Neto</th>
                </tr>
              </thead>
              <tbody>
                {tops.map((r) => (
                  <tr key={`${r.cafe_id}-${r.profile_id}`} className="border-t">
                    <td className="p-3 font-medium">
                      {r.cafe_id ? (
                        <Link
                          href={`/app/admin/cafes/${r.cafe_id}`}
                          className="hover:underline text-blue-600"
                        >
                          {(r.cafe_nombre ?? "").trim() || "Cafetería"}
                        </Link>
                      ) : (
                        <span>{(r.cafe_nombre ?? "").trim() || "Cafetería"}</span>
                      )}
                    </td>
                    <td className="p-3 font-medium">
                      {r.profile_id ? (
                        <Link
                          href={`/app/admin/clientes/${r.profile_id}`}
                          className="hover:underline text-blue-600"
                        >
                          {(r.cliente_nombre ?? "").trim() || "Cliente (sin nombre)"}
                        </Link>
                      ) : (
                        <span>{(r.cliente_nombre ?? "").trim() || "Cliente (sin nombre)"}</span>
                      )}
                    </td>
                    <td className="p-3">{fmtInt(r.movimientos)}</td>
                    <td className="p-3 text-green-600">{fmtInt(r.generado)}</td>
                    <td className="p-3 text-red-500">{fmtInt(r.canjeado)}</td>
                    <td className="p-3 font-semibold">{fmtInt(r.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* EVOLUCIÓN DIARIA (movimientos globales) */}
          <section className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b font-semibold">📈 Movimientos por día (últimos 30 días)</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Movimientos</th>
                  <th className="text-left p-3">Generado</th>
                  <th className="text-left p-3">Canjeado</th>
                  <th className="text-left p-3">Neto</th>
                </tr>
              </thead>
              <tbody>
                {days.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-3 text-gray-700">{new Date(r.fecha).toLocaleDateString("es-UY")}</td>
                    <td className="p-3">{fmtInt(r.movimientos)}</td>
                    <td className="p-3 text-green-600">{fmtInt(r.generado)}</td>
                    <td className="p-3 text-red-500">{fmtInt(r.canjeado)}</td>
                    <td className="p-3 font-semibold">{fmtInt(r.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === "cafeterias" && (
        <div className="space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              title="Movimientos (30d)"
              value={fmtInt(k.movimientos_30d)}
              subtitle={`Earn: ${fmtInt(k.earn_30d)} · Redeem: ${fmtInt(k.redeem_30d)}`}
            />
            <KpiCard
              title={<><AppMark /> netos (30d)</>}
              value={fmtInt(k.neto_30d)}
              subtitle={`Generado: ${fmtInt(k.generado_30d)} · Canjeado: ${fmtInt(k.canjeado_30d)}`}
            />
            <KpiCard
              title="Cafeterías activas (30d)"
              value={fmtInt(k.cafes_activas_30d)}
              subtitle={`Clientes activos: ${fmtInt(k.clientes_activos_30d)}`}
            />
          </div>

          {/* ALERTAS */}
          <section className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b font-semibold">🚨 Alertas (7d vs 7d anterior)</div>
            {al.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">Sin alertas por ahora ✅</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Cafetería</th>
                    <th className="text-left p-3">Mov 7d</th>
                    <th className="text-left p-3">Mov prev 7d</th>
                    <th className="text-left p-3">Δ Mov</th>
                    <th className="text-left p-3">Δ %</th>
                    <th className="text-left p-3">Neto 7d</th>
                  </tr>
                </thead>
                <tbody>
                  {al.map((r) => (
                    <tr key={r.cafe_id} className="border-t">
                      <td className="p-3 font-medium">
                        <Link href={`/app/admin/cafes/${r.cafe_id}`} className="hover:underline text-blue-600">
                          {r.cafe_nombre ?? "—"}
                        </Link>
                      </td>
                      <td className="p-3">{fmtInt(r.mov_7d)}</td>
                      <td className="p-3">{fmtInt(r.mov_prev_7d)}</td>
                      <td className="p-3">{fmtInt(r.delta_mov)}</td>
                      <td className="p-3">
                        <span
                          className={
                            Number(r.delta_mov_pct) < 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"
                          }
                        >
                          {fmtInt(r.delta_mov_pct)}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            Number(r.neto_7d) < 0 ? "text-red-600 font-semibold" : "text-gray-900 font-semibold"
                          }
                        >
                          {fmtInt(r.neto_7d)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* RENDIMIENTO POR CAFETERÍA */}
          <section className="bg-white rounded-xl shadow overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b font-semibold">
            <AppMark iconOnly iconSize={18} />
            Rendimiento por Cafetería (30 días)
          </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Cafetería</th>
                  <th className="text-left p-3">Movimientos</th>
                  <th className="text-left p-3">Generado</th>
                  <th className="text-left p-3">Canjeado</th>
                  <th className="text-left p-3">Neto</th>
                </tr>
              </thead>
              <tbody>
                {cafes.map((r) => (
                  <tr key={r.cafe_id} className="border-t">
                    <td className="p-3 font-medium">
                      <Link
                        href={`/app/admin/cafes/${r.cafe_id}`}
                        className="hover:underline text-blue-600"
                      >
                        {r.cafe_nombre ?? "—"}
                      </Link>
                    </td>
                    <td className="p-3">{fmtInt(r.movimientos)}</td>
                    <td className="p-3 text-green-600">{fmtInt(r.generado)}</td>
                    <td className="p-3 text-red-500">{fmtInt(r.canjeado)}</td>
                    <td className="p-3 font-semibold">{fmtInt(r.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
