import Link from "next/link";
import AdminNivelesTabs from "./tabs";

export default function AdminNivelesPage() {
  return (
    <div className="space-y-6">
      {/* Botón volver a admin */}
      <div>
        <Link
          href="/app/admin"
          className="inline-flex items-center border rounded-md px-3 py-2 text-sm hover:bg-gray-100 transition"
        >
          ← Volver a Admin
        </Link>
      </div>

      <AdminNivelesTabs />
    </div>
  );
}
