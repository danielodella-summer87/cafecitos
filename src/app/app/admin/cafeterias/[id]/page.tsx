import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getAdminProfileById } from "@/app/actions/adminReports";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCafeteriasDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const { id: profileId } = await params;
  const profile = await getAdminProfileById(profileId);
  if (!profile) notFound();

  const displayName =
    (profile.full_name ?? "").trim() ||
    (profile.cedula ?? "").trim() ||
    "Owner (sin nombre)";

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

      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-4">☕ Ficha cafetería / owner</h1>
        <p className="text-sm text-gray-500 mb-4">Socio owner: {displayName}</p>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-gray-500">ID</dt>
            <dd className="font-mono text-gray-900">{profile.id}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Nombre completo</dt>
            <dd className="text-gray-900">{profile.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Cédula</dt>
            <dd className="text-gray-900">{profile.cedula ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Rol</dt>
            <dd className="text-gray-900">{profile.role ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
