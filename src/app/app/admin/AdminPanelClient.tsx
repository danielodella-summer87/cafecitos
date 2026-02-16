"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { PRO } from "@/lib/ui/pro";
import {
  adminUpdateSettings,
  adminUpsertTier,
  adminUpsertReward,
  adminUpsertCafe,
  adminUpdateCafeActive,
  adminUpdateProfileActive,
  adminUpdateProfileTier,
  type AdminSettings,
  type AdminTier,
  type AdminReward,
} from "@/app/actions/adminPro";

type Props = {
  initialSettings: AdminSettings | null;
  initialTiers: AdminTier[];
  initialRewards: AdminReward[];
  initialProfiles: Array<{
    id: string;
    full_name: string | null;
    cedula: string;
    role: string;
    is_active: boolean;
    tier_id: string | null;
    cafe_id: string | null;
    created_at: string;
  }>;
  initialCafes: Array<{ id: string; name: string; is_active?: boolean }>;
  serverErrors: string[];
};

type Tab = "config" | "tiers" | "rewards" | "profiles" | "cafes";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}

export default function AdminPanelClient(props: Props) {
  const [tab, setTab] = useState<Tab>("config");
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const [settings, setSettings] = useState<AdminSettings>(
    props.initialSettings ?? {
      welcome_bonus_points: 5,
      max_points_per_hour: 0,
      max_points_per_day: 0,
      max_points_per_month: 0,
      max_redeem_per_day: 0,
      cross_cafe_redeem: true,
      show_membership_badge: true,
    }
  );

  const [tiers, setTiers] = useState<AdminTier[]>(props.initialTiers ?? []);
  const [rewards, setRewards] = useState<AdminReward[]>(props.initialRewards ?? []);
  const [profiles, setProfiles] = useState(props.initialProfiles ?? []);
  const [cafes, setCafes] = useState(props.initialCafes ?? []);

  const tierOptions = useMemo(
    () => [{ id: "", name: "— Sin nivel —" }, ...tiers.map((t) => ({ id: t.id ?? "", name: t.name }))],
    [tiers]
  );

  function notify(msg: string) {
    setToast(msg);
    if (toastRef.current) window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className={PRO.page}>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Image src="/logoamorperfecto.png" alt="Amor Perfecto" width={40} height={40} className="h-10 w-auto" />
          <h1 className="text-3xl font-semibold">Panel Admin</h1>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className={`px-4 py-2 rounded-md border ${tab === "config" ? "bg-black text-white" : "bg-white"}`} onClick={() => setTab("config")}>Configuración</button>
          <button className={`px-4 py-2 rounded-md border ${tab === "tiers" ? "bg-black text-white" : "bg-white"}`} onClick={() => setTab("tiers")}>Niveles</button>
          <button className={`px-4 py-2 rounded-md border ${tab === "rewards" ? "bg-black text-white" : "bg-white"}`} onClick={() => setTab("rewards")}>Beneficios</button>
          <button className={`px-4 py-2 rounded-md border ${tab === "profiles" ? "bg-black text-white" : "bg-white"}`} onClick={() => setTab("profiles")}>Socios</button>
          <button className={`px-4 py-2 rounded-md border ${tab === "cafes" ? "bg-black text-white" : "bg-white"}`} onClick={() => setTab("cafes")}>Cafeterías</button>
        </div>

        {props.serverErrors?.length ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="font-semibold text-red-800 mb-2">Errores del servidor</div>
            <ul className="list-disc pl-5 text-sm text-red-700">
              {props.serverErrors.map((e, idx) => <li key={idx}>{e}</li>)}
            </ul>
            <div className="text-xs text-red-700 mt-2">
              Si ves error de tier_id, corré la migration (supabase db push).
            </div>
          </div>
        ) : null}

        {toast ? (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black text-white px-4 py-2 text-sm shadow">
            {toast}
          </div>
        ) : null}

        {/* ========================= CONFIG ========================= */}
        {tab === "config" && (
          <div className="rounded-2xl border p-6 space-y-6 bg-white">
            <div>
              <div className="text-xl font-semibold">Configuración global</div>
              <div className="text-sm text-neutral-500">Bonus, límites, reglas.</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Cortesía bienvenida (cafecitos)">
                <input className="w-full border rounded-lg px-3 py-2" type="number"
                  value={settings.welcome_bonus_points}
                  onChange={(e) => setSettings({ ...settings, welcome_bonus_points: Number(e.target.value) })}
                />
              </Field>

              <Field label="Máx. canje por día (por socio)">
                <input className="w-full border rounded-lg px-3 py-2" type="number"
                  value={settings.max_redeem_per_day}
                  onChange={(e) => setSettings({ ...settings, max_redeem_per_day: Number(e.target.value) })}
                />
              </Field>

              <Field label="Máx. asignación por hora (por cafetería)">
                <input className="w-full border rounded-lg px-3 py-2" type="number"
                  value={settings.max_points_per_hour}
                  onChange={(e) => setSettings({ ...settings, max_points_per_hour: Number(e.target.value) })}
                />
              </Field>

              <Field label="Máx. asignación por día (por cafetería)">
                <input className="w-full border rounded-lg px-3 py-2" type="number"
                  value={settings.max_points_per_day}
                  onChange={(e) => setSettings({ ...settings, max_points_per_day: Number(e.target.value) })}
                />
              </Field>

              <Field label="Máx. asignación por mes (por cafetería)">
                <input className="w-full border rounded-lg px-3 py-2" type="number"
                  value={settings.max_points_per_month}
                  onChange={(e) => setSettings({ ...settings, max_points_per_month: Number(e.target.value) })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 border rounded-xl p-4">
                <input
                  type="checkbox"
                  checked={settings.cross_cafe_redeem}
                  onChange={(e) => setSettings({ ...settings, cross_cafe_redeem: e.target.checked })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Canje cruzado entre cafeterías</div>
                  <div className="text-sm text-neutral-500">Si está activo, el socio canjea en cualquier cafetería.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 border rounded-xl p-4">
                <input
                  type="checkbox"
                  checked={settings.show_membership_badge}
                  onChange={(e) => setSettings({ ...settings, show_membership_badge: e.target.checked })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Mostrar badge de membresía</div>
                  <div className="text-sm text-neutral-500">Muestra la barra negra con el nivel del socio.</div>
                </div>
              </label>
            </div>

            <button
              className="rounded-lg bg-black text-white px-4 py-2"
              onClick={async () => {
                const res = await adminUpdateSettings(settings);
                if (!res.ok) return notify(`Error: ${res.error}`);
                notify("✅ Configuración guardada");
              }}
            >
              Guardar configuración
            </button>
          </div>
        )}

        {/* ========================= TIERS ========================= */}
        {tab === "tiers" && (
          <div className="rounded-2xl border p-6 bg-white space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">Niveles</div>
                <div className="text-sm text-neutral-500">Editá nombre, mínimo de cafecitos, badge y orden.</div>
              </div>
              <button
                className="rounded-lg border px-4 py-2 hover:bg-neutral-50"
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

            <div className="space-y-3">
              {tiers.map((t, idx) => (
                <div key={t.id ?? `new-${idx}`} className="rounded-xl border p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <Field label="Slug">
                      <input className="w-full border rounded-lg px-3 py-2" value={t.slug}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTiers((arr) => arr.map((x) => (x === t ? { ...x, slug: v } : x)));
                        }}
                      />
                    </Field>
                    <Field label="Nombre">
                      <input className="w-full border rounded-lg px-3 py-2" value={t.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTiers((arr) => arr.map((x) => (x === t ? { ...x, name: v } : x)));
                        }}
                      />
                    </Field>
                    <Field label="Mín. cafecitos">
                      <input className="w-full border rounded-lg px-3 py-2" type="number" value={t.min_points ?? 0}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTiers((arr) => arr.map((x) => (x === t ? { ...x, min_points: v } : x)));
                        }}
                      />
                    </Field>
                    <Field label="Badge (texto corto)">
                      <input className="w-full border rounded-lg px-3 py-2" value={t.badge_label ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTiers((arr) => arr.map((x) => (x === t ? { ...x, badge_label: v } : x)));
                        }}
                      />
                    </Field>
                    <Field label="Mensaje">
                      <input className="w-full border rounded-lg px-3 py-2" value={t.badge_message ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTiers((arr) => arr.map((x) => (x === t ? { ...x, badge_message: v } : x)));
                        }}
                      />
                    </Field>
                    <Field label="Orden">
                      <input className="w-full border rounded-lg px-3 py-2" type="number" value={t.sort_order ?? 0}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTiers((arr) => arr.map((x) => (x === t ? { ...x, sort_order: v } : x)));
                        }}
                      />
                    </Field>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!t.is_active}
                        onChange={(e) => setTiers((arr) => arr.map((x) => (x === t ? { ...x, is_active: e.target.checked } : x)))}
                      />
                      Activo
                    </label>

                    <button
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
        )}

        {/* ========================= REWARDS ========================= */}
        {tab === "rewards" && (
          <div className="rounded-2xl border p-6 bg-white space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">Beneficios</div>
                <div className="text-sm text-neutral-500">Editá título, costo y activo. (Global o por cafetería)</div>
              </div>
              <button
                className="rounded-lg border px-4 py-2 hover:bg-neutral-50"
                onClick={() =>
                  setRewards([
                    {
                      title: "Nuevo beneficio",
                      description: "Descripción",
                      cost_points: 10,
                      is_global: true,
                      cafe_id: null,
                      is_active: true,
                    },
                    ...rewards,
                  ])
                }
              >
                + Agregar beneficio
              </button>
            </div>

            <div className="space-y-3">
              {rewards.map((r, idx) => (
                <div key={r.id ?? `new-${idx}`} className="rounded-xl border p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Field label="Título">
                      <input className="w-full border rounded-lg px-3 py-2" value={r.title}
                        onChange={(e) => setRewards((arr) => arr.map((x) => (x === r ? { ...x, title: e.target.value } : x)))}
                      />
                    </Field>

                    <Field label="Costo (cafecitos)">
                      <input className="w-full border rounded-lg px-3 py-2" type="number" value={r.cost_points ?? 0}
                        onChange={(e) => setRewards((arr) => arr.map((x) => (x === r ? { ...x, cost_points: Number(e.target.value) } : x)))}
                      />
                    </Field>

                    <Field label="Alcance">
                      <select className="w-full border rounded-lg px-3 py-2"
                        value={r.is_global ? "global" : "cafe"}
                        onChange={(e) => {
                          const isGlobal = e.target.value === "global";
                          setRewards((arr) => arr.map((x) => (x === r ? { ...x, is_global: isGlobal, cafe_id: isGlobal ? null : (cafes[0]?.id ?? null) } : x)));
                        }}
                      >
                        <option value="global">Global</option>
                        <option value="cafe">Por cafetería</option>
                      </select>
                    </Field>

                    <Field label="Cafetería (si aplica)">
                      <select className="w-full border rounded-lg px-3 py-2"
                        disabled={!!r.is_global}
                        value={r.cafe_id ?? ""}
                        onChange={(e) => setRewards((arr) => arr.map((x) => (x === r ? { ...x, cafe_id: e.target.value || null } : x)))}
                      >
                        <option value="">—</option>
                        {cafes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Descripción">
                    <textarea className="w-full border rounded-lg px-3 py-2 mt-2" rows={2}
                      value={r.description ?? ""}
                      onChange={(e) => setRewards((arr) => arr.map((x) => (x === r ? { ...x, description: e.target.value } : x)))}
                    />
                  </Field>

                  <div className="flex items-center justify-between mt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!r.is_active}
                        onChange={(e) => setRewards((arr) => arr.map((x) => (x === r ? { ...x, is_active: e.target.checked } : x)))}
                      />
                      Activo
                    </label>

                    <button
                      className="rounded-lg bg-black text-white px-4 py-2"
                      onClick={async () => {
                        const res = await adminUpsertReward(r);
                        if (!res.ok) return notify(`Error: ${res.error}`);
                        notify("✅ Beneficio guardado");
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================= PROFILES ========================= */}
        {tab === "profiles" && (
          <div className="rounded-2xl border p-6 bg-white space-y-4">
            <div>
              <div className="text-xl font-semibold">Socios</div>
              <div className="text-sm text-neutral-500">Activar/desactivar (admin NO), asignar nivel.</div>
            </div>

            <div className="overflow-auto border rounded-xl">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr className="text-left">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">CI</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Nivel</th>
                    <th className="p-3">Activo</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">{p.full_name ?? "(sin nombre)"}</td>
                      <td className="p-3">{p.cedula}</td>
                      <td className="p-3">{p.role}</td>
                      <td className="p-3">
                        <select
                          className="border rounded-lg px-2 py-1"
                          value={p.tier_id ?? ""}
                          onChange={(e) =>
                            setProfiles((arr) =>
                              arr.map((x) => (x.id === p.id ? { ...x, tier_id: e.target.value || null } : x))
                            )
                          }
                        >
                          {tierOptions.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={!!p.is_active}
                          disabled={p.role === "admin"}
                          onChange={(e) =>
                            setProfiles((arr) => arr.map((x) => (x.id === p.id ? { ...x, is_active: e.target.checked } : x)))
                          }
                        />
                      </td>
                      <td className="p-3 flex gap-2">
                        <button
                          className="border rounded-lg px-3 py-1 hover:bg-neutral-50"
                          onClick={async () => {
                            const r = await adminUpdateProfileTier({ profile_id: p.id, tier_id: p.tier_id ?? null });
                            if (!r.ok) return notify(`Error: ${r.error}`);
                            notify("✅ Nivel actualizado");
                          }}
                        >
                          Guardar nivel
                        </button>

                        <button
                          className={`border rounded-lg px-3 py-1 ${p.role === "admin" ? "opacity-50 cursor-not-allowed" : "hover:bg-neutral-50"}`}
                          disabled={p.role === "admin"}
                          onClick={async () => {
                            const r = await adminUpdateProfileActive({ profile_id: p.id, is_active: !!p.is_active });
                            if (!r.ok) return notify(`Error: ${r.error}`);
                            notify("✅ Estado actualizado");
                          }}
                        >
                          Guardar activo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-neutral-500">
              Admin no se puede desactivar.
            </div>
          </div>
        )}

        {/* ========================= CAFES ========================= */}
        {tab === "cafes" && (
          <div className="rounded-2xl border p-6 bg-white space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">Cafeterías</div>
                <div className="text-sm text-neutral-500">Activar/desactivar, editar nombre, y agregar nuevas.</div>
              </div>
              <button
                className="rounded-lg border px-4 py-2 hover:bg-neutral-50"
                onClick={() => setCafes([{ id: "", name: "Nueva cafetería", is_active: true }, ...cafes])}
              >
                + Agregar cafetería
              </button>
            </div>

            <div className="space-y-3">
              {cafes.map((c, idx) => (
                <div key={c.id || `new-${idx}`} className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  <div className="flex-1">
                    <Field label="Nombre">
                      <input
                        className="w-full border rounded-lg px-3 py-2"
                        value={c.name}
                        onChange={(e) =>
                          setCafes((arr) => arr.map((x) => (x === c ? { ...x, name: e.target.value } : x)))
                        }
                      />
                    </Field>
                  </div>

                  <label className="flex items-center gap-2 text-sm mt-6 md:mt-0">
                    <input
                      type="checkbox"
                      checked={c.is_active ?? true}
                      onChange={(e) =>
                        setCafes((arr) => arr.map((x) => (x === c ? { ...x, is_active: e.target.checked } : x)))
                      }
                    />
                    Activa
                  </label>

                  <div className="flex gap-2 mt-6 md:mt-0">
                    <button
                      className="rounded-lg bg-black text-white px-4 py-2"
                      onClick={async () => {
                        const payload = { id: c.id || undefined, name: c.name, is_active: !!c.is_active };
                        const r = await adminUpsertCafe(payload);
                        if (!r.ok) return notify(`Error: ${r.error}`);
                        notify("✅ Cafetería guardada");
                      }}
                    >
                      Guardar
                    </button>

                    {c.id ? (
                      <button
                        className="rounded-lg border px-4 py-2 hover:bg-neutral-50"
                        onClick={async () => {
                          const r = await adminUpdateCafeActive({ cafe_id: c.id, is_active: !!c.is_active });
                          if (!r.ok) return notify(`Error: ${r.error}`);
                          notify("✅ Estado actualizado");
                        }}
                      >
                        Guardar activa
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
