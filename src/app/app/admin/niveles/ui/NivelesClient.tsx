"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getClientTiers,
  getCafeTiers,
  type TierRow,
  type CafeTierRowNiveles,
} from "@/app/actions/adminReports";
import type { AdminTier } from "@/app/actions/adminPro";
import type { CafeTierRow } from "@/app/actions/adminCafeTiers";
import ClientTiersClient from "../ClientTiersClient";
import CafeTiersClient from "../CafeTiersClient";

type Tab = "clientes" | "cafeterias";

function tierToAdminTier(t: TierRow): AdminTier {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    min_points: t.min_points,
    badge_label: t.badge_label,
    badge_message: t.badge_message,
    dot_color: t.dot_color,
    sort_order: t.sort_order,
    is_active: t.is_active,
  };
}

function cafeToCafeTierRow(c: CafeTierRowNiveles): CafeTierRow {
  return {
    id: c.id,
    name: c.name,
    min_total_points: c.min_total_points,
    badge_color: c.badge_color,
    created_at: c.created_at,
    updated_at: null,
  };
}

export default function NivelesClient() {
  const [tab, setTab] = useState<Tab>("clientes");
  const [clientTiers, setClientTiers] = useState<TierRow[]>([]);
  const [cafeTiers, setCafeTiers] = useState<CafeTierRowNiveles[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const [ct, cafet] = await Promise.all([getClientTiers(), getCafeTiers()]);
        if (!mounted) return;
        setClientTiers(ct);
        setCafeTiers(cafet);
      } catch (e: unknown) {
        if (!mounted) return;
        setErr(e instanceof Error ? e.message : "Error cargando niveles");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Niveles</h1>
          <p className="text-gray-500">Clientes y cafeterías por separado.</p>
        </div>
        <Link
          href="/app/admin"
          className="inline-flex items-center border rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-100 transition"
        >
          ← Volver al Panel Admin
        </Link>
      </div>

      <div className="inline-flex border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setTab("clientes")}
          className={`px-4 py-2 text-sm font-medium ${tab === "clientes" ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
        >
          Clientes
        </button>
        <button
          type="button"
          onClick={() => setTab("cafeterias")}
          className={`px-4 py-2 text-sm font-medium ${tab === "cafeterias" ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
        >
          Cafeterías
        </button>
      </div>

      {loading && <p className="text-gray-500">Cargando…</p>}
      {err && <p className="text-red-600">{err}</p>}

      {!loading && !err && tab === "clientes" && (
        <ClientTiersClient initial={clientTiers.map(tierToAdminTier)} />
      )}
      {!loading && !err && tab === "cafeterias" && (
        <CafeTiersClient initial={cafeTiers.map(cafeToCafeTierRow)} />
      )}
    </main>
  );
}
