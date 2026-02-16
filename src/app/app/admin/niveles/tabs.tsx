"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getAdminCafeTiers } from "@/app/actions/adminCafeTiers";
import { adminListTiers } from "@/app/actions/adminPro";
import type { CafeTierRow } from "@/app/actions/adminCafeTiers";
import type { AdminTier } from "@/app/actions/adminPro";
import CafeTiersClient from "./CafeTiersClient";
import ClientTiersClient from "./ClientTiersClient";

export default function AdminNivelesTabs() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") ?? "clientes").toLowerCase();
  const isClientes = tab !== "cafeterias";

  const [clientTiers, setClientTiers] = useState<AdminTier[]>([]);
  const [cafeTiers, setCafeTiers] = useState<CafeTierRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([adminListTiers(), getAdminCafeTiers()])
      .then(([tiersRes, cafe]) => {
        if (cancelled) return;
        setClientTiers(tiersRes.ok ? tiersRes.tiers : []);
        setCafeTiers(cafe);
      })
      .catch(() => {
        if (!cancelled) setClientTiers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-gray-500">Cargando niveles…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Niveles</h1>
          <p className="text-gray-500">Separado por clientes y cafeterías.</p>
        </div>

        <div className="inline-flex border rounded-xl overflow-hidden">
          <Link
            href="/app/admin/niveles?tab=clientes"
            className={`px-4 py-2 text-sm font-medium ${isClientes ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
          >
            Clientes
          </Link>
          <Link
            href="/app/admin/niveles?tab=cafeterias"
            className={`px-4 py-2 text-sm font-medium ${!isClientes ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
          >
            Cafeterías
          </Link>
        </div>
      </div>

      {isClientes ? (
        <ClientTiersClient initial={clientTiers} />
      ) : (
        <CafeTiersClient initial={cafeTiers} />
      )}

      <p className="text-sm text-gray-500">
        <Link href="/app/admin" className="hover:underline">
          ← Volver a Admin
        </Link>
      </p>
    </div>
  );
}
