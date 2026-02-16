"use client";

import Link from "next/link";
import type { CafeKpiRow, DailyKpiRow, TopCustomerRow } from "@/app/actions/adminReports";

export default function ReportesAdminClient({
  kpis,
  daily,
  top,
}: {
  kpis: CafeKpiRow[];
  daily: DailyKpiRow[];
  top: TopCustomerRow[];
}) {
  const totalMovimientos30 = daily.reduce((s, d) => s + d.movimientos, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/admin" className="text-sm text-neutral-600 hover:text-black">
          ← Panel Admin
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">📊 Panel de Decisiones</h1>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-sm text-gray-500">Movimientos últimos 30 días</p>
          <p className="text-2xl font-bold">{totalMovimientos30}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-sm text-gray-500">Cafeterías activas</p>
          <p className="text-2xl font-bold">{kpis.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-sm text-gray-500">Estado</p>
          <p className="text-lg font-medium text-green-600">Demo activa</p>
        </div>
      </div>

      {/* TABLA: Rendimiento por Cafetería */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b font-semibold">
          ☕ Rendimiento por Cafetería (30 días)
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
            {kpis.map((r) => (
              <tr key={r.cafe_id} className="border-t">
                <td className="p-3 font-medium">{r.cafe_nombre ?? r.cafe_id}</td>
                <td className="p-3">{r.movimientos}</td>
                <td className="p-3 text-green-600">{r.generado}</td>
                <td className="p-3 text-red-500">{r.canjeado}</td>
                <td className="p-3 font-semibold">{r.neto}</td>
              </tr>
            ))}
            {kpis.length === 0 && (
              <tr>
                <td className="p-4 text-neutral-500" colSpan={5}>
                  Sin datos aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Serie diaria */}
      <section className="mb-10 rounded-2xl border bg-white p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Actividad diaria (últimos 30 días)</h2>
          <p className="text-sm text-neutral-600">Ideal para gráfico (lo armamos después).</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-600">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Mov.</th>
                <th className="py-2 pr-4">Generado</th>
                <th className="py-2 pr-4">Canjeado</th>
                <th className="py-2 pr-4">Neto</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((r) => (
                <tr key={r.fecha} className="border-b">
                  <td className="py-2 pr-4 font-medium">{r.fecha}</td>
                  <td className="py-2 pr-4">{r.movimientos}</td>
                  <td className="py-2 pr-4">{r.generado}</td>
                  <td className="py-2 pr-4">{r.canjeado}</td>
                  <td className="py-2 pr-4">{r.neto}</td>
                </tr>
              ))}
              {daily.length === 0 && (
                <tr>
                  <td className="py-4 text-neutral-500" colSpan={5}>
                    Sin datos aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top clientes */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Top clientes (global)</h2>
          <p className="text-sm text-neutral-600">Quiénes generan más cafecitos (VIPs).</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-600">
                <th className="py-2 pr-4">Cafetería</th>
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Mov.</th>
                <th className="py-2 pr-4">Generado</th>
                <th className="py-2 pr-4">Canjeado</th>
                <th className="py-2 pr-4">Neto</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r, i) => (
                <tr key={`${r.cafe_id}-${r.profile_id}-${i}`} className="border-b">
                  <td className="py-2 pr-4 font-medium">{r.cafe_nombre ?? r.cafe_id}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.profile_id}</td>
                  <td className="py-2 pr-4">{r.movimientos}</td>
                  <td className="py-2 pr-4">{r.generado}</td>
                  <td className="py-2 pr-4">{r.canjeado}</td>
                  <td className="py-2 pr-4">{r.neto}</td>
                </tr>
              ))}
              {top.length === 0 && (
                <tr>
                  <td className="py-4 text-neutral-500" colSpan={6}>
                    Sin datos aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
