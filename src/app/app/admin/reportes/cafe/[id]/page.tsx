import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import {
  getAdminCafeById,
  getAdminCafeDetailKpis,
  getAdminCafeDailyKpis,
  getAdminCafeTopClients7d,
} from "@/app/actions/adminReports";

type Props = { params: Promise<{ id: string }> };

function fmtInt(n: unknown) {
  const num = Number(n ?? 0);
  return Number.isFinite(num) ? num.toLocaleString("es-UY") : "0";
}

export default async function CafeReportPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const { id: cafeId } = await params;

  const [cafe, kpis, days, tops] = await Promise.all([
    getAdminCafeById(cafeId),
    getAdminCafeDetailKpis(cafeId, 30),
    getAdminCafeDailyKpis(cafeId, 30),
    getAdminCafeTopClients7d(cafeId, 20),
  ]);

  if (!cafe) notFound();

  const k = kpis;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/app/admin/reportes"
            className="text-sm text-gray-500 hover:underline"
          >
            ← Volver a reportes
          </Link>
          <h1 className="text-2xl font-semibold mt-2">☕ {cafe.name ?? "Cafetería"}</h1>
          <p className="text-sm text-gray-500">Detalle de performance del local</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Movimientos (30d)"
          value={fmtInt(k.movimientos_30d)}
          subtitle={`Clientes únicos: ${fmtInt(k.clientes_unicos_30d)}`}
        />
        <KpiCard
          title="Cafecitos netos (30d)"
          value={fmtInt(k.neto_30d)}
          subtitle={`Generado: ${fmtInt(k.generado_30d)} · Canjeado: ${fmtInt(k.canjeado_30d)}`}
        />
        <KpiCard
          title="Lectura rápida"
          value={Number(k.neto_30d) >= 0 ? "✅ Bien" : "⚠️ Ojo"}
          subtitle={
            Number(k.neto_30d) >= 0
              ? "Saldo positivo en 30 días"
              : "Saldo negativo en 30 días"
          }
        />
      </div>

      <section className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b font-semibold">
          🏆 Top clientes del local (últimos 7 días)
        </div>
        {tops.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">
            Sin actividad en los últimos 7 días.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Cédula</th>
                <th className="text-left p-3">Movimientos</th>
                <th className="text-left p-3">Generado</th>
                <th className="text-left p-3">Canjeado</th>
                <th className="text-left p-3">Neto</th>
              </tr>
            </thead>
            <tbody>
              {tops.map((r) => (
                <tr key={r.profile_id} className="border-t">
                  <td className="p-3 font-medium">{r.full_name ?? "—"}</td>
                  <td className="p-3 text-gray-600">{r.cedula ?? "—"}</td>
                  <td className="p-3">{fmtInt(r.movimientos)}</td>
                  <td className="p-3 text-green-600">{fmtInt(r.generado)}</td>
                  <td className="p-3 text-red-500">{fmtInt(r.canjeado)}</td>
                  <td className="p-3 font-semibold">{fmtInt(r.neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b font-semibold">
          📈 Evolución diaria del local (últimos 30 días)
        </div>
        {days.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">
            Sin actividad en los últimos 30 días.
          </div>
        ) : (
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
                  <td className="p-3 text-gray-700">
                    {new Date(r.fecha).toLocaleDateString("es-UY")}
                  </td>
                  <td className="p-3">{fmtInt(r.movimientos)}</td>
                  <td className="p-3 text-green-600">{fmtInt(r.generado)}</td>
                  <td className="p-3 text-red-500">{fmtInt(r.canjeado)}</td>
                  <td className="p-3 font-semibold">{fmtInt(r.neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
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
