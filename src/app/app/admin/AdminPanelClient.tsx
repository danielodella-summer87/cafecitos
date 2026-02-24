"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useEffect } from "react";
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
import { logout } from "@/app/actions/logout";
import { createOwnerForCafe } from "@/app/actions/adminOwners";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotionActive,
  type PromotionRow,
} from "@/app/actions/adminPromotions";
import { resolvePromotionImage } from "@/lib/resolvePromotionImage";
import { SHOW_MEDIA_DEBUG, getImageDebugLabel } from "@/lib/mediaDebug";

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
    phone?: string | null;
  }>;
  initialCafes: Array<{ id: string; name: string; is_active?: boolean }>;
  initialOwnerCafes?: Record<string, Array<{ cafe_id: string; cafe_name: string; cafe_tier_name: string | null; badge_color: string | null; total_points: number }>>;
  initialPromotions?: PromotionRow[];
  serverErrors: string[];
};

type Tab = "config" | "tiers" | "rewards" | "profiles" | "owners" | "promotions" | "cafes";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}

const FALLBACK_PROMO_IMAGE = "/media/cover-default.jpg";

function PromoViewImage({ promo }: { promo: PromotionRow }) {
  const resolved = resolvePromotionImage(promo);
  const [src, setSrc] = useState(resolved);
  useEffect(() => {
    setSrc(resolved);
  }, [resolved]);
  const debugLabel = SHOW_MEDIA_DEBUG ? getImageDebugLabel(src, FALLBACK_PROMO_IMAGE) : null;
  return (
    <div>
      <div className="relative h-40 w-full rounded-xl overflow-hidden bg-neutral-100">
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setSrc(FALLBACK_PROMO_IMAGE)}
        />
      </div>
      {SHOW_MEDIA_DEBUG && debugLabel && (
        <div className="text-[10px] opacity-60 mt-1 break-all">{debugLabel}</div>
      )}
    </div>
  );
}

function PromoFormPreview({ image_path }: { image_path: string }) {
  const src = resolvePromotionImage({ image_path: image_path.trim() || null });
  const [imgSrc, setImgSrc] = useState(src);
  useEffect(() => {
    setImgSrc(src);
  }, [src]);
  if (!image_path.trim()) return null;
  return (
    <Field label="Vista previa">
      <div className="relative h-24 w-full rounded-lg overflow-hidden bg-neutral-100">
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgSrc(FALLBACK_PROMO_IMAGE)}
        />
      </div>
    </Field>
  );
}

export default function AdminPanelClient(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("config");
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

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
  const [promotions, setPromotions] = useState<PromotionRow[]>(props.initialPromotions ?? []);
  const [exportLoading, setExportLoading] = useState(false);
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [ownerSubmitting, setOwnerSubmitting] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    full_name: "",
    cedula: "",
    pin: "",
    phone: "",
    cafe_id: "",
  });
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoModalEditingId, setPromoModalEditingId] = useState<string | null>(null);
  const [promoViewOpen, setPromoViewOpen] = useState(false);
  const [promoToView, setPromoToView] = useState<PromotionRow | null>(null);
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    image_path: "",
    scope: "specific" as "global" | "specific",
    cafe_ids: [] as string[],
    start_at: "",
    end_at: "",
  });

  const emptyPromoForm = () => ({
    title: "",
    subtitle: "",
    description: "",
    image_path: "",
    scope: "specific" as "global" | "specific",
    cafe_ids: [] as string[],
    start_at: "",
    end_at: "",
  });

  const tierOptions = useMemo(
    () => [{ id: "", name: "— Sin nivel —" }, ...tiers.map((t) => ({ id: t.id ?? "", name: t.name }))],
    [tiers]
  );

  const consumers = useMemo(
    () => (profiles ?? []).filter((u) => u.role === "consumer"),
    [profiles]
  );

  // Tab Owners: solo role === "owner". Admins no se listan aquí.
  const owners = useMemo(
    () => (profiles ?? []).filter((u) => u.role === "owner"),
    [profiles]
  );

  const cafeNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of cafes) {
      if (c.id) m[c.id] = c.name ?? "—";
    }
    return m;
  }, [cafes]);

  function notify(msg: string) {
    setToast(msg);

    if (toastRef.current) {
      globalThis.clearTimeout(toastRef.current);
    }

    toastRef.current = globalThis.setTimeout(() => {
      setToast(null);
    }, 2500);
  }

  async function handleExportExcel() {
    setExportLoading(true);
    try {
      const res = await fetch("/app/admin/clientes/export");
      if (!res.ok) throw new Error("Error al exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clientes.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      notify("✅ Excel descargado");
    } catch {
      notify("Error al exportar Excel");
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className={PRO.page}>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Image src="/logoamorperfecto.png" alt="Amor Perfecto" width={40} height={40} className="h-10 w-auto" />
            <h1 className="text-3xl font-semibold">Panel Admin</h1>
          </div>
          <form action={logout} onSubmit={() => { if (typeof window !== "undefined") localStorage.removeItem("cafecitos.activeRoleMode"); }}>
            <button type="submit" className="px-4 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-medium">
              Salir
            </button>
          </form>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button className={`px-4 py-2 rounded-md border ${tab === "config" ? "bg-black text-white" : "bg-white"}`} onClick={() => setTab("config")}>Configuración</button>
          <Link href="/app/admin/niveles" className="px-4 py-2 rounded-md border bg-white hover:bg-neutral-50 text-neutral-700 no-underline">
            Niveles
          </Link>
          <button className={`px-4 py-2 rounded-md border ${tab === "profiles" ? "bg-black text-white" : "bg-white"}`} onClick={() => setTab("profiles")}>Clientes</button>
          <button className={`px-4 py-2 rounded-md border ${tab === "owners" ? "bg-black text-white" : "bg-white"}`} onClick={() => setTab("owners")}>Owners</button>
          <button className={`px-4 py-2 rounded-md border ${tab === "promotions" ? "bg-black text-white" : "bg-white"}`} onClick={() => setTab("promotions")}>Promociones</button>
          <Link href="/app/admin/cafes" className="px-4 py-2 rounded-md border bg-white hover:bg-neutral-50 text-neutral-700 no-underline">
            Cafeterías
          </Link>
          <Link href="/app/admin/reportes" className="px-4 py-2 rounded-md border bg-white hover:bg-neutral-50 text-neutral-700">
            Reportes
          </Link>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xl font-semibold">Clientes</div>
                <div className="text-sm text-neutral-500">Activar/desactivar (admin NO), asignar nivel.</div>
              </div>
              <button
                type="button"
                disabled={exportLoading}
                onClick={handleExportExcel}
                className="rounded-lg px-4 py-2 border border-green-600 text-green-700 bg-white hover:bg-green-50 font-medium disabled:opacity-50"
              >
                {exportLoading ? "Exportando…" : "Exportar Excel"}
              </button>
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
                  {consumers.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-medium">
                        {p.role === "owner" && p.cafe_id ? (
                          <Link
                            href={`/app/admin/cafes/${p.cafe_id}`}
                            className="text-gray-900 hover:text-amber-600 hover:underline transition"
                          >
                            {p.full_name ?? "(sin nombre)"}
                          </Link>
                        ) : p.role === "consumer" || !p.cafe_id ? (
                          <Link
                            href={`/app/admin/clientes/${p.id}`}
                            className="text-gray-900 hover:text-amber-600 hover:underline transition"
                          >
                            {p.full_name ?? "(sin nombre)"}
                          </Link>
                        ) : (
                          <span>{p.full_name ?? "(sin nombre)"}</span>
                        )}
                      </td>
                      <td className="p-3">{p.cedula}</td>
                      <td className="p-3">{p.role}</td>
                      <td className="p-3">
                        {p.role === "owner" ? (
                          <div className="flex flex-wrap gap-2">
                            {(props.initialOwnerCafes?.[p.id] ?? []).length === 0 ? (
                              <span className="text-neutral-500 text-sm">—</span>
                            ) : (
                              (props.initialOwnerCafes?.[p.id] ?? []).map((c) => (
                                <span
                                  key={c.cafe_id}
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                  style={{
                                    backgroundColor: c.badge_color ? `${c.badge_color}20` : "#f3f4f6",
                                    color: c.badge_color ?? "#374151",
                                  }}
                                >
                                  {c.cafe_name}: {c.cafe_tier_name ?? "—"} ({c.total_points} pts)
                                </span>
                              ))
                            )}
                          </div>
                        ) : (
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
                        )}
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
                        {p.role !== "owner" && (
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
                        )}

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

        {/* ========================= OWNERS ========================= */}
        {tab === "owners" && (
          <div className="rounded-2xl border p-6 bg-white space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xl font-semibold">Owners</div>
                <div className="text-sm text-neutral-500">Usuarios con rol owner (solo en profiles). Cafetería asociada por cafe_id.</div>
              </div>
              <button
                type="button"
                className="rounded-lg border px-4 py-2 hover:bg-neutral-50 font-medium"
                onClick={() => setOwnerModalOpen(true)}
              >
                Crear owner
              </button>
            </div>

            {ownerModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !ownerSubmitting && setOwnerModalOpen(false)}>
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="text-lg font-semibold">Crear owner</div>
                  <Field label="Nombre">
                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      value={ownerForm.full_name}
                      onChange={(e) => setOwnerForm((f) => ({ ...f, full_name: e.target.value }))}
                      placeholder="Nombre completo"
                    />
                  </Field>
                  <Field label="Cédula (8 dígitos)">
                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      value={ownerForm.cedula}
                      onChange={(e) => setOwnerForm((f) => ({ ...f, cedula: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                      placeholder="12345678"
                      maxLength={8}
                      inputMode="numeric"
                    />
                  </Field>
                  {/* PIN normalizado a 4 dígitos: maxLength=4 y sanitizado en onChange. */}
                  <Field label="PIN (4 dígitos)">
                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      type="password"
                      value={ownerForm.pin}
                      onChange={(e) => setOwnerForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                      placeholder="••••"
                      maxLength={4}
                      inputMode="numeric"
                    />
                  </Field>
                  <Field label="Teléfono (opcional)">
                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      value={ownerForm.phone}
                      onChange={(e) => setOwnerForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder=""
                    />
                  </Field>
                  <Field label="Cafetería">
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={ownerForm.cafe_id}
                      onChange={(e) => setOwnerForm((f) => ({ ...f, cafe_id: e.target.value }))}
                    >
                      <option value="">— Seleccionar —</option>
                      {[...cafes].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
                      disabled={ownerSubmitting || !ownerForm.full_name.trim() || ownerForm.cedula.length !== 8 || ownerForm.pin.length < 4 || !ownerForm.cafe_id}
                      onClick={async () => {
                        setOwnerSubmitting(true);
                        try {
                          const res = await createOwnerForCafe({
                            full_name: ownerForm.full_name.trim(),
                            cedula: ownerForm.cedula,
                            pin: ownerForm.pin,
                            phone: ownerForm.phone.trim() || undefined,
                            cafe_id: ownerForm.cafe_id,
                          });
                          if (!res.ok) {
                            notify(`Error: ${res.error}`);
                            return;
                          }
                          setProfiles((prev) => [
                            ...prev,
                            {
                              id: res.owner.id,
                              full_name: res.owner.full_name,
                              cedula: res.owner.cedula,
                              role: "owner",
                              is_active: true,
                              tier_id: null,
                              cafe_id: res.owner.cafe_id,
                              created_at: new Date().toISOString(),
                              phone: ownerForm.phone.trim() || null,
                            },
                          ]);
                          notify("✅ Owner creado");
                          setOwnerModalOpen(false);
                          setOwnerForm({ full_name: "", cedula: "", pin: "", phone: "", cafe_id: "" });
                          router.refresh();
                        } finally {
                          setOwnerSubmitting(false);
                        }
                      }}
                    >
                      {ownerSubmitting ? "Guardando…" : "Crear"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-4 py-2 hover:bg-neutral-50"
                      disabled={ownerSubmitting}
                      onClick={() => { setOwnerModalOpen(false); setOwnerForm({ full_name: "", cedula: "", pin: "", phone: "", cafe_id: "" }); }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-auto border rounded-xl">
              <table className="min-w-[700px] w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr className="text-left">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">CI / ID</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Cafetería asociada</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-medium">{p.full_name ?? "(sin nombre)"}</td>
                      <td className="p-3">{p.cedula}</td>
                      <td className="p-3">
                        {/* Badge por rol: Owner / Admin. */}
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.role === "owner" ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-700"}`}>
                          {p.role === "owner" ? "Owner" : "Admin"}
                        </span>
                      </td>
                      <td className="p-3">{p.cafe_id ? (cafeNameById[p.cafe_id] ?? "—") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================= PROMOCIONES ========================= */}
        {tab === "promotions" && (
          <div className="rounded-2xl border p-6 bg-white space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xl font-semibold">Promociones</div>
                <div className="text-sm text-neutral-500">Crear, editar y asignar a cafeterías. Global = todas las activas; Específica = solo las elegidas.</div>
              </div>
              <button
                type="button"
                className="rounded-lg border px-4 py-2 hover:bg-neutral-50 font-medium"
                onClick={() => {
                  setPromoModalEditingId(null);
                  setPromoError(null);
                  setPromoForm(emptyPromoForm());
                  setPromoModalOpen(true);
                }}
              >
                + Crear promoción
              </button>
            </div>

            <div className="overflow-auto border rounded-xl">
              <table className="min-w-[700px] w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr className="text-left">
                    <th className="p-3">Título</th>
                    <th className="p-3">Alcance</th>
                    <th className="p-3">Cafeterías</th>
                    <th className="p-3">Activa</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-medium">{p.title}</td>
                      <td className="p-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.scope === "global" ? "bg-blue-100 text-blue-800" : "bg-neutral-100 text-neutral-700"}`}>
                          {p.scope === "global" ? "Global" : "Específica"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {p.scope === "global" ? (
                            <span className="text-neutral-500 text-xs">Todas las activas</span>
                          ) : p.cafe_names.length === 0 ? (
                            <span className="text-amber-600 text-xs">Sin asignar</span>
                          ) : (
                            p.cafe_names.slice(0, 5).map((n) => (
                              <span key={n} className="inline-flex rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-xs">
                                {n}
                              </span>
                            ))
                          )}
                          {p.scope === "specific" && p.cafe_names.length > 5 && (
                            <span className="text-neutral-500 text-xs">+{p.cafe_names.length - 5}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={!!p.is_active}
                          onChange={async (e) => {
                            const res = await togglePromotionActive(p.id, e.target.checked);
                            if (!res.ok) {
                              notify(`Error: ${res.error}`);
                              return;
                            }
                            setPromotions((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: e.target.checked } : x)));
                            notify("✅ Actualizado");
                            router.refresh();
                          }}
                        />
                      </td>
                      <td className="p-3 flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg border px-3 py-1 hover:bg-neutral-50 text-sm font-medium"
                          onClick={() => {
                            setPromoToView(p);
                            setPromoViewOpen(true);
                          }}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="border rounded-lg px-3 py-1 hover:bg-neutral-50 text-sm"
                          onClick={() => {
                            setPromoModalEditingId(p.id);
                            setPromoError(null);
                            setPromoForm({
                              title: p.title,
                              subtitle: p.subtitle ?? "",
                              description: p.description ?? "",
                              image_path: p.image_path ?? "",
                              scope: (p.scope === "global" ? "global" : "specific") as "global" | "specific",
                              cafe_ids: p.cafe_ids ?? [],
                              start_at: p.start_at ? p.start_at.slice(0, 16) : "",
                              end_at: p.end_at ? p.end_at.slice(0, 16) : "",
                            });
                            setPromoModalOpen(true);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="border border-red-200 rounded-lg px-3 py-1 hover:bg-red-50 text-red-700 text-sm"
                          onClick={async () => {
                            if (!confirm("¿Eliminar esta promoción?")) return;
                            const res = await deletePromotion(p.id);
                            if (!res.ok) {
                              notify(`Error: ${res.error}`);
                              return;
                            }
                            setPromotions((prev) => prev.filter((x) => x.id !== p.id));
                            notify("✅ Eliminada");
                            router.refresh();
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {promotions.length === 0 && (
              <p className="text-sm text-neutral-500">No hay promociones. Creá una con el botón superior.</p>
            )}

            {/* Modal Ver promoción (solo lectura) */}
            {promoViewOpen && promoToView && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="text-lg font-semibold">Ver promoción</div>
                  {/* Imagen arriba */}
                  <PromoViewImage promo={promoToView} />
                  <Field label="Título">
                    <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800">{promoToView.title}</div>
                  </Field>
                  <Field label="Subtítulo">
                    <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800">{promoToView.subtitle ?? "—"}</div>
                  </Field>
                  <Field label="Descripción">
                    <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800 min-h-[4rem]">{promoToView.description ?? "—"}</div>
                  </Field>
                  <Field label="Image path">
                    <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800 break-all">{promoToView.image_path ?? "—"}</div>
                  </Field>
                  <Field label="Imagen (path en uso)">
                    <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800 break-all">{promoToView.image_path ?? "—"}</div>
                  </Field>
                  <Field label="Alcance">
                    <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800">
                      {promoToView.scope === "global" ? "Global" : "Específica"}
                    </div>
                  </Field>
                  <Field label="Cafeterías asignadas">
                    <div className="flex flex-wrap gap-2 border rounded-lg p-3 bg-neutral-50 min-h-[2.5rem]">
                      {promoToView.scope === "global" ? (
                        <span className="text-neutral-600 text-sm">Todas las activas</span>
                      ) : promoToView.cafe_names?.length ? (
                        promoToView.cafe_names.map((n) => (
                          <span key={n} className="inline-flex rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs">
                            {n}
                          </span>
                        ))
                      ) : (
                        <span className="text-neutral-500 text-sm">Sin asignar</span>
                      )}
                    </div>
                  </Field>
                  <Field label="Inicio">
                    <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800">
                      {promoToView.start_at ? new Date(promoToView.start_at).toLocaleString() : "—"}
                    </div>
                  </Field>
                  <Field label="Fin">
                    <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800">
                      {promoToView.end_at ? new Date(promoToView.end_at).toLocaleString() : "—"}
                    </div>
                  </Field>
                  <Field label="Activa">
                    <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800">
                      {promoToView.is_active ? "Sí" : "No"}
                    </div>
                  </Field>
                  {promoToView.created_at && (
                    <Field label="Creada">
                      <div className="w-full border rounded-lg px-3 py-2 bg-neutral-50 text-neutral-800 text-sm">
                        {new Date(promoToView.created_at).toLocaleString()}
                      </div>
                    </Field>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      className="rounded-lg border px-4 py-2 hover:bg-neutral-50 font-medium"
                      onClick={() => {
                        setPromoViewOpen(false);
                        setPromoToView(null);
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {promoModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="text-lg font-semibold">{promoModalEditingId ? "Editar promoción" : "Crear promoción"}</div>
                  {promoError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                      {promoError}
                    </div>
                  )}
                  <Field label="Título (obligatorio)">
                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      value={promoForm.title}
                      onChange={(e) => setPromoForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ej: Desayuno 2x1"
                    />
                  </Field>
                  <Field label="Subtítulo (opcional)">
                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      value={promoForm.subtitle}
                      onChange={(e) => setPromoForm((f) => ({ ...f, subtitle: e.target.value }))}
                      placeholder=""
                    />
                  </Field>
                  <Field label="Descripción (opcional)">
                    <textarea
                      className="w-full border rounded-lg px-3 py-2"
                      rows={2}
                      value={promoForm.description}
                      onChange={(e) => setPromoForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder=""
                    />
                  </Field>
                  <Field label="Image path (opcional)">
                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      value={promoForm.image_path}
                      onChange={(e) => setPromoForm((f) => ({ ...f, image_path: e.target.value }))}
                      placeholder="media/promo/P-001.jpg"
                    />
                  </Field>
                  <PromoFormPreview image_path={promoForm.image_path} />
                  <Field label="Alcance">
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={promoForm.scope}
                      onChange={(e) => setPromoForm((f) => ({ ...f, scope: e.target.value as "global" | "specific" }))}
                    >
                      <option value="global">Global (todas las cafeterías activas)</option>
                      <option value="specific">Específica (elegir cafeterías)</option>
                    </select>
                  </Field>
                  {promoForm.scope === "specific" && (
                    <Field label="Cafeterías (al menos una)">
                      <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                        {cafes.filter((c) => c.is_active !== false).map((c) => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={promoForm.cafe_ids.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPromoForm((f) => ({ ...f, cafe_ids: [...f.cafe_ids, c.id] }));
                                } else {
                                  setPromoForm((f) => ({ ...f, cafe_ids: f.cafe_ids.filter((id) => id !== c.id) }));
                                }
                              }}
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                        {cafes.filter((c) => c.is_active !== false).length === 0 && (
                          <p className="text-xs text-amber-600">No hay cafeterías activas. Activá al menos una en Cafeterías.</p>
                        )}
                      </div>
                    </Field>
                  )}
                  <Field label="Inicio (opcional)">
                    <input
                      type="datetime-local"
                      className="w-full border rounded-lg px-3 py-2"
                      value={promoForm.start_at}
                      onChange={(e) => setPromoForm((f) => ({ ...f, start_at: e.target.value }))}
                    />
                  </Field>
                  <Field label="Fin (opcional)">
                    <input
                      type="datetime-local"
                      className="w-full border rounded-lg px-3 py-2"
                      value={promoForm.end_at}
                      onChange={(e) => setPromoForm((f) => ({ ...f, end_at: e.target.value }))}
                    />
                  </Field>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
                      disabled={promoSubmitting || promoForm.title.trim().length < 2 || (promoForm.scope === "specific" && promoForm.cafe_ids.length < 1)}
                      onClick={async () => {
                        setPromoSubmitting(true);
                        setPromoError(null);
                        try {
                          const payload = {
                            title: promoForm.title.trim(),
                            subtitle: promoForm.subtitle.trim() || null,
                            description: promoForm.description.trim() || null,
                            image_path: promoForm.image_path.trim() || null,
                            scope: promoForm.scope,
                            cafe_ids: promoForm.scope === "specific" ? promoForm.cafe_ids : [],
                            start_at: promoForm.start_at.trim() || null,
                            end_at: promoForm.end_at.trim() || null,
                          };
                          if (promoModalEditingId) {
                            const res = await updatePromotion(promoModalEditingId, payload);
                            if (!res.ok) {
                              setPromoError(res.error);
                              setPromoSubmitting(false);
                              return;
                            }
                            setPromotions((prev) =>
                              prev.map((x) => {
                                if (x.id !== promoModalEditingId) return x;
                                return {
                                  ...x,
                                  ...payload,
                                  cafe_ids: payload.cafe_ids,
                                  cafe_names: payload.scope === "global"
                                    ? cafes.filter((c) => c.is_active !== false).map((c) => c.name)
                                    : payload.cafe_ids.map((id) => cafes.find((c) => c.id === id)?.name ?? id),
                                };
                              })
                            );
                          } else {
                            const res = await createPromotion(payload);
                            if (!res.ok) {
                              setPromoError(res.error);
                              setPromoSubmitting(false);
                              return;
                            }
                            const newRow: PromotionRow = {
                              id: (res as { id: string }).id,
                              title: payload.title,
                              subtitle: payload.subtitle,
                              description: payload.description,
                              image_path: payload.image_path,
                              is_active: true,
                              scope: payload.scope,
                              start_at: payload.start_at,
                              end_at: payload.end_at,
                              created_at: new Date().toISOString(),
                              cafe_ids: payload.cafe_ids,
                              cafe_names:
                                payload.scope === "global"
                                  ? cafes.filter((c) => c.is_active !== false).map((c) => c.name)
                                  : payload.cafe_ids.map((id) => cafes.find((c) => c.id === id)?.name ?? id),
                            };
                            setPromotions((prev) => [newRow, ...prev]);
                          }
                          notify("✅ Guardado");
                          setPromoModalOpen(false);
                          setPromoForm(emptyPromoForm());
                          setPromoModalEditingId(null);
                          router.refresh();
                        } catch (err) {
                          setPromoError(err instanceof Error ? err.message : "Error al guardar");
                        } finally {
                          setPromoSubmitting(false);
                        }
                      }}
                    >
                      {promoSubmitting ? "Guardando…" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-4 py-2 hover:bg-neutral-50 disabled:opacity-50"
                      disabled={promoSubmitting}
                      onClick={() => {
                        if (promoSubmitting) return;
                        setPromoModalOpen(false);
                        setPromoError(null);
                        setPromoForm(emptyPromoForm());
                        setPromoModalEditingId(null);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
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
