"use client";

import { useState, useRef } from "react";
import { adminUpsertTier, type AdminTier } from "@/app/actions/adminPro";

type Props = { initial: AdminTier[] };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}

export default function ClientTiersClient({ initial }: Props) {
  const [tiers, setTiers] = useState<AdminTier[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notify(msg: string) {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Niveles de clientes</h2>
          <p className="text-sm text-gray-500">Editá nombre, mínimo de cafecitos, badge y orden.</p>
        </div>
        <button
          type="button"
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
          onClick={() =>
            setTiers([
              {
                slug: "nuevo",
                name: "Nuevo nivel",
                min_points: 0,
                badge_label: "Nuevo",
                badge_message: "Mensaje",
                dot_color: "#9CA3AF",
                sort_order: tiers.length + 1,
                is_active: true,
              },
              ...tiers,
            ])
          }
        >
          + Agregar nivel
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black text-white px-4 py-2 text-sm shadow">
          {toast}
        </div>
      )}

      <div className="space-y-3">
        {tiers.map((t, idx) => (
          <div key={t.id ?? `new-${idx}`} className="rounded-xl border p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Field label="Slug">
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={t.slug ?? ""}
                  onChange={(e) =>
                    setTiers((arr) => arr.map((x) => (x === t ? { ...x, slug: e.target.value } : x)))
                  }
                />
              </Field>
              <Field label="Nombre">
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={t.name ?? ""}
                  onChange={(e) =>
                    setTiers((arr) => arr.map((x) => (x === t ? { ...x, name: e.target.value } : x)))
                  }
                />
              </Field>
              <Field label="Mín. cafecitos">
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  value={t.min_points ?? 0}
                  onChange={(e) =>
                    setTiers((arr) =>
                      arr.map((x) => (x === t ? { ...x, min_points: Number(e.target.value) } : x))
                    )
                  }
                />
              </Field>
              <Field label="Badge (texto corto)">
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={t.badge_label ?? ""}
                  onChange={(e) =>
                    setTiers((arr) =>
                      arr.map((x) => (x === t ? { ...x, badge_label: e.target.value } : x))
                    )
                  }
                />
              </Field>
              <Field label="Mensaje">
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={t.badge_message ?? ""}
                  onChange={(e) =>
                    setTiers((arr) =>
                      arr.map((x) => (x === t ? { ...x, badge_message: e.target.value } : x))
                    )
                  }
                />
              </Field>
              <Field label="Orden">
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  value={t.sort_order ?? 0}
                  onChange={(e) =>
                    setTiers((arr) =>
                      arr.map((x) => (x === t ? { ...x, sort_order: Number(e.target.value) } : x))
                    )
                  }
                />
              </Field>
            </div>
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!t.is_active}
                  onChange={(e) =>
                    setTiers((arr) =>
                      arr.map((x) => (x === t ? { ...x, is_active: e.target.checked } : x))
                    )
                  }
                />
                Activo
              </label>
              <button
                type="button"
                className="rounded-lg bg-black text-white px-4 py-2"
                onClick={async () => {
                  const res = await adminUpsertTier(t);
                  if (!res.ok) return notify(`Error: ${res.error}`);
                  notify("✅ Nivel guardado");
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
