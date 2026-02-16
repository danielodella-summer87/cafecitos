import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import {
  getAdminCafeById,
  getAdminCafeDetailKpis,
} from "@/app/actions/adminReports";

type Props = { params: Promise<{ id: string }> };

function fmtInt(n: unknown) {
  const num = Number(n ?? 0);
  return Number.isFinite(num) ? num.toLocaleString("es-UY") : "0";
}

export default async function AdminCafeDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const { id: cafeId } = await params;
  const [cafe, kpis] = await Promise.all([
    getAdminCafeById(cafeId),
    getAdminCafeDetailKpis(cafeId, 30),
  ]);

  if (!cafe) notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/app/admin/reportes"
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition"
        >
          ← Volver a Reportes
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">☕ {cafe.name || "Cafetería"}</h1>
        <p className="text-sm text-gray-500 mb-6">ID: <span className="font-mono">{cafe.id}</span></p>

        <h2 className="text-lg font-medium mb-3">Métricas últimos 30 días</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Movimientos</dt>
            <dd className="font-semibold">{fmtInt(kpis.movimientos_30d)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Generado</dt>
            <dd className="font-semibold text-green-600">{fmtInt(kpis.generado_30d)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Canjeado</dt>
            <dd className="font-semibold text-red-500">{fmtInt(kpis.canjeado_30d)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Neto</dt>
            <dd className="font-semibold">{fmtInt(kpis.neto_30d)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Clientes únicos</dt>
            <dd className="font-semibold">{fmtInt(kpis.clientes_unicos_30d)}</dd>
          </div>
        </dl>
      </div>

      <p className="text-sm text-gray-500">
        <Link href={`/app/admin/reportes/cafe/${cafe.id}`} className="text-blue-600 hover:underline">
          Ver detalle completo y evolución →
        </Link>
      </p>
    </div>
  );
}
