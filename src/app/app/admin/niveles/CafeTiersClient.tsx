"use client";

import { useMemo, useState, useTransition } from "react";
import {
  type CafeTierRow,
  upsertAdminCafeTier,
  deleteAdminCafeTier,
} from "@/app/actions/adminCafeTiers";

type Props = { initial: CafeTierRow[] };

export default function CafeTiersClient({ initial }: Props) {
  const [rows, setRows] = useState<CafeTierRow[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (a.min_total_points ?? 0) - (b.min_total_points ?? 0));
  }, [rows]);

  const onChange = (id: string, patch: Partial<CafeTierRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const onSave = (row: CafeTierRow) => {
    if ((row.name ?? "").trim().length === 0) return;
    startTransition(async () => {
      const result = await upsertAdminCafeTier({
        id: row.id,
        name: row.name,
        min_total_points: Number(row.min_total_points ?? 0),
        badge_color: row.badge_color ?? null,
      });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setSaveError(null);
      if (result.id && result.id !== row.id) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, id: result.id! } : r)));
      }
      setToast("Guardado ✅");
      setTimeout(() => setToast(null), 2500);
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("¿Eliminar nivel de cafetería?")) return;
    startTransition(async () => {
      await deleteAdminCafeTier(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    });
  };

  const onAddDefault = () => {
    const nowId = crypto.randomUUID();
    setRows((prev) => [
      ...prev,
      {
        id: nowId,
        name: "",
        min_total_points: 0,
        badge_color: "#CD7F32",
        created_at: null,
        updated_at: null,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {saveError}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Niveles de cafeterías</h2>
          <p className="text-sm text-gray-500">
            Ej: Bronce / Plata / Oro / Platinum (según puntos totales generados en esa cafetería).
          </p>
        </div>
        <button
          type="button"
          className="border rounded px-3 py-2 hover:bg-gray-50"
          onClick={onAddDefault}
          disabled={isPending}
        >
          + Agregar nivel cafetería
        </button>
      </div>

      <div className="overflow-auto border rounded-xl">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Min. puntos totales</th>
              <th className="text-left p-3">Color badge</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    placeholder="Ej: Bronce / Plata / Oro"
                    value={r.name ?? ""}
                    onChange={(e) => onChange(r.id, { name: e.target.value })}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-full"
                    value={r.min_total_points ?? 0}
                    onChange={(e) => onChange(r.id, { min_total_points: Number(e.target.value) })}
                  />
                </td>
                <td className="p-3">
                  <input
                    className="border rounded px-2 py-1 w-full"
                    placeholder="#RRGGBB"
                    value={r.badge_color ?? ""}
                    onChange={(e) => onChange(r.id, { badge_color: e.target.value })}
                  />
                </td>
                <td className="p-3 text-right space-x-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => onSave(r)}
                    disabled={isPending || (r.name ?? "").trim().length === 0}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded border hover:bg-gray-50"
                    onClick={() => onDelete(r.id)}
                    disabled={isPending}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={4}>
                  Sin niveles de cafetería. Creá Bronce/Plata/Oro/Platinum.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        Tip: si querés cargar los 4 niveles rápido, agregá 4 filas con min_total_points escalados (ej. 0/500/1500/4000).
      </div>
    </div>
  );
}
