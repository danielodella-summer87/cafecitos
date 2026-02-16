"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminUpdateSettings,
  adminUpsertTier,
  adminUpsertReward,
  adminUpdateProfileActive,
  adminSetProfileTier,
  adminResetPinByCedula,
  adminSetCafeActive,
  adminUpsertCafe,
} from "@/app/actions/adminPro";

type Settings = {
  welcome_bonus_points: number;
  max_points_per_hour: number;
  max_points_per_day: number;
  max_points_per_month: number;
  max_redeem_per_day: number;
};

type Tier = {
  id?: string;
  slug: string;
  name: string;
  min_points: number;
  badge_label?: string | null;
  badge_message?: string | null;
  badge_text?: string | null;
  dot_color?: string | null;
  sort_order: number;
  is_active: boolean;
};

type Reward = {
  id?: string;
  title: string;
  description?: string | null;
  cost_points: number;
  is_global: boolean;
  cafe_id?: string | null;
  is_active: boolean;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  cedula: string | null;
  role: "consumer" | "owner" | "admin" | string;
  phone?: string | null;
  is_active: boolean | null;
  tier_id?: string | null;
  cafe_id: string | null;
  created_at: string | null;
};

type CafeRow = {
  id: string;
  name: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type AdminActionResult = { ok: true; data?: unknown } | { ok: false; error: string };

export default function AdminPanelClient(props: {
  initialSettings: Settings | null;
  initialTiers: Tier[];
  initialRewards: Reward[];
  initialProfiles: ProfileRow[];
  initialCafes: CafeRow[];
  serverErrors: {
    settings: string | null;
    tiers: string | null;
    rewards: string | null;
    profiles: string | null;
    cafes: string | null;
  };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"config" | "tiers" | "rewards" | "socios" | "cafes">("config");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [newCafeName, setNewCafeName] = useState("");
  const [newCafeLoading, setNewCafeLoading] = useState(false);
  const [localCafes, setLocalCafes] = useState<CafeRow[]>(() => props.initialCafes ?? []);

  useEffect(() => {
    setLocalCafes(props.initialCafes ?? []);
  }, [props.initialCafes]);

  const settings = props.initialSettings ?? {
    welcome_bonus_points: 5,
    max_points_per_hour: 0,
    max_points_per_day: 0,
    max_points_per_month: 0,
    max_redeem_per_day: 0,
  };

  const tiers = props.initialTiers ?? [];
  const rewards = props.initialRewards ?? [];
  const profiles = props.initialProfiles ?? [];
  const cafes = localCafes;

  const tierOptions = useMemo(() => {
    const list = props.initialTiers ?? [];
    return [{ id: "", name: "— Sin nivel —" }, ...list.map((t) => ({ id: t.id ?? "", name: `${t.name} (min ${t.min_points})` }))];
  }, [props.initialTiers]);

  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function notify(msg: string) {
    setToast(msg);
    if (toastRef.current) window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(null), 2500);
  }

  async function run(fn: () => Promise<AdminActionResult>, okMsg: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        notify(res.error ?? "Error");
        return;
      }
      notify(okMsg);
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/logoamorperfecto.png" alt="Amor Perfecto" width={44} height={44} className="h-11 w-auto" />
            <div>
              <div className="text-sm text-neutral-500">Amor Perfecto</div>
              <div className="text-xl font-semibold">Panel Admin</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`rounded-lg px-3 py-2 text-sm border ${tab === "config" ? "bg-black text-white border-black" : "bg-white"}`}
              onClick={() => setTab("config")}
            >
              Configuración
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm border ${tab === "tiers" ? "bg-black text-white border-black" : "bg-white"}`}
              onClick={() => setTab("tiers")}
            >
              Niveles
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm border ${tab === "rewards" ? "bg-black text-white border-black" : "bg-white"}`}
              onClick={() => setTab("rewards")}
            >
              Beneficios
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm border ${tab === "socios" ? "bg-black text-white border-black" : "bg-white"}`}
              onClick={() => setTab("socios")}
            >
              Socios
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm border ${tab === "cafes" ? "bg-black text-white border-black" : "bg-white"}`}
              onClick={() => setTab("cafes")}
            >
              Cafeterías
            </button>
          </div>
        </div>

        {toast && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="rounded-xl border bg-neutral-50 px-3 py-2 text-sm text-neutral-800">{toast}</div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {tab === "config" && (
          <Card title="Configuración global" subtitle="Controla cortesías y límites anti-abuso (por ahora hardcoded, luego full panel).">
            {props.serverErrors.settings && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{props.serverErrors.settings}</div>
            )}
            <SettingsForm
              initial={settings}
              disabled={pending}
              onSave={(next) => run(() => adminUpdateSettings(next), "Configuración guardada")}
            />
          </Card>
        )}

        {tab === "tiers" && (
          <Card title="Niveles (tiers)" subtitle="Define los 5 niveles, mínimos de cafecitos y el mensaje tipo Starbucks (VIP · Cafecitos extra...).">
            {props.serverErrors.tiers && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{props.serverErrors.tiers}</div>
            )}
            <TierEditor
              tiers={tiers}
              disabled={pending}
              onUpsert={(t) => run(() => adminUpsertTier(t), "Nivel guardado")}
            />
          </Card>
        )}

        {tab === "rewards" && (
          <Card title="Beneficios (rewards)" subtitle="Qué se puede canjear y cuánto cuesta. Global o por cafetería (en el futuro).">
            {props.serverErrors.rewards && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{props.serverErrors.rewards}</div>
            )}
            <RewardEditor
              rewards={rewards}
              disabled={pending}
              onUpsert={(r) => run(() => adminUpsertReward(r), "Beneficio guardado")}
            />
          </Card>
        )}

        {tab === "socios" && (
          <Card title="Socios" subtitle="Activar/Inactivar · cambiar nivel · resetear PIN.">
            {props.serverErrors.profiles && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{props.serverErrors.profiles}</div>
            )}
            <SociosPanel
              profiles={profiles}
              tiers={tierOptions}
              disabled={pending}
              onSetActive={(profile_id, is_active) => run(() => adminUpdateProfileActive({ profile_id, is_active }), "Estado actualizado")}
              onSetTier={(profile_id, tier_id) => run(() => adminSetProfileTier({ profile_id, tier_id: tier_id || null }), "Nivel actualizado")}
              onResetPin={(cedula, pin) => run(() => adminResetPinByCedula({ cedula, pin }), "PIN actualizado")}
            />
          </Card>
        )}

        {tab === "cafes" && (
          <Card title="Cafeterías" subtitle="Activar/Inactivar cafeterías. (Luego: límites por hora/día/mes por local).">
            {props.serverErrors.cafes && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{props.serverErrors.cafes}</div>
            )}

            <div className="rounded-xl border p-4 mb-4 bg-white">
              <div className="font-semibold mb-2">Agregar cafetería</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-sm block mb-1">Nombre</label>
                  <input
                    value={newCafeName}
                    onChange={(e) => setNewCafeName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Ej: Amor Perfecto — Centro"
                    maxLength={60}
                  />
                </div>
                <button
                  type="button"
                  disabled={newCafeLoading || newCafeName.trim().length < 3}
                  className="rounded-lg px-4 py-2 bg-black text-white disabled:opacity-60"
                  onClick={async () => {
                    const name = newCafeName.trim();
                    if (name.length < 3) return;
                    setNewCafeLoading(true);
                    try {
                      const res = await adminUpsertCafe({ name, is_active: true });
                      if (!res.ok) {
                        notify((res as { error?: string }).error ?? "No se pudo crear");
                        return;
                      }
                      const data = res.data as { id?: string } | undefined;
                      setLocalCafes((prev) => [{ id: data?.id ?? "", name, is_active: true, created_at: null }, ...prev]);
                      setNewCafeName("");
                      notify("✅ Cafetería creada");
                    } finally {
                      setNewCafeLoading(false);
                    }
                  }}
                >
                  {newCafeLoading ? "Creando..." : "Crear"}
                </button>
              </div>
            </div>

            <CafesPanel
              cafes={cafes}
              disabled={pending}
              onSetActive={(cafe_id, is_active) => run(() => adminSetCafeActive({ cafe_id, is_active }), "Cafetería actualizada")}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

function Card(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="p-5 border-b">
        <div className="text-lg font-semibold">{props.title}</div>
        {props.subtitle && <div className="text-sm text-neutral-500 mt-1">{props.subtitle}</div>}
      </div>
      <div className="p-5">{props.children}</div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-sm font-medium">{props.label}</div>
      {props.hint && <div className="text-xs text-neutral-500 mb-1">{props.hint}</div>}
      {props.children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 ${props.className ?? ""}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 ${props.className ?? ""}`}
    />
  );
}

function Toggle(props: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => props.onChange(!props.value)}
      className={`px-3 py-2 rounded-lg text-sm border ${props.value ? "bg-black text-white border-black" : "bg-white"} disabled:opacity-60`}
    >
      {props.value ? "Activo" : "Inactivo"}
    </button>
  );
}

function SettingsForm(props: { initial: Settings; disabled?: boolean; onSave: (next: Settings) => void }) {
  const [s, setS] = useState<Settings>(props.initial);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Cortesía al registrarse" hint="Cafecitos gratis al dar de alta un socio (hoy: 5).">
        <Input type="number" min={0} value={s.welcome_bonus_points} onChange={(e) => setS({ ...s, welcome_bonus_points: Number(e.target.value) })} disabled={props.disabled} />
      </Field>
      <Field label="Máx cafecitos por hora (por cafetería)" hint="0 = sin límite (por ahora).">
        <Input type="number" min={0} value={s.max_points_per_hour} onChange={(e) => setS({ ...s, max_points_per_hour: Number(e.target.value) })} disabled={props.disabled} />
      </Field>
      <Field label="Máx cafecitos por día (por cafetería)" hint="0 = sin límite (por ahora).">
        <Input type="number" min={0} value={s.max_points_per_day} onChange={(e) => setS({ ...s, max_points_per_day: Number(e.target.value) })} disabled={props.disabled} />
      </Field>
      <Field label="Máx cafecitos por mes (por cafetería)" hint="0 = sin límite (por ahora).">
        <Input type="number" min={0} value={s.max_points_per_month} onChange={(e) => setS({ ...s, max_points_per_month: Number(e.target.value) })} disabled={props.disabled} />
      </Field>
      <Field label="Máx canjes por día (por socio)" hint="0 = sin límite (por ahora).">
        <Input type="number" min={0} value={s.max_redeem_per_day} onChange={(e) => setS({ ...s, max_redeem_per_day: Number(e.target.value) })} disabled={props.disabled} />
      </Field>
      <div className="md:col-span-2 pt-2">
        <button type="button" disabled={props.disabled} onClick={() => props.onSave(s)} className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-60">
          Guardar configuración
        </button>
      </div>
    </div>
  );
}

function TierEditor(props: { tiers: Tier[]; disabled?: boolean; onUpsert: (tier: Tier) => void }) {
  const [draft, setDraft] = useState<Tier>({
    slug: "plata",
    name: "Plata",
    min_points: 0,
    badge_label: "Cliente frecuente",
    badge_message: "Sumás más rápido",
    dot_color: "silver",
    sort_order: 1,
    is_active: true,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4">
        <div className="text-sm font-semibold mb-3">Crear / editar nivel</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Slug">
            <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} disabled={props.disabled} />
          </Field>
          <Field label="Nombre">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} disabled={props.disabled} />
          </Field>
          <Field label="Mín cafecitos">
            <Input type="number" min={0} value={draft.min_points} onChange={(e) => setDraft({ ...draft, min_points: Number(e.target.value) })} disabled={props.disabled} />
          </Field>
          <Field label="Etiqueta (badge)">
            <Input value={draft.badge_label ?? ""} onChange={(e) => setDraft({ ...draft, badge_label: e.target.value })} disabled={props.disabled} />
          </Field>
          <Field label="Mensaje corto">
            <Input value={draft.badge_message ?? ""} onChange={(e) => setDraft({ ...draft, badge_message: e.target.value })} disabled={props.disabled} />
          </Field>
          <Field label="Dot color (ej: silver, gold, #aaa)">
            <Input value={draft.dot_color ?? ""} onChange={(e) => setDraft({ ...draft, dot_color: e.target.value })} disabled={props.disabled} />
          </Field>
          <Field label="Orden">
            <Input type="number" min={0} value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} disabled={props.disabled} />
          </Field>
          <Field label="Estado">
            <div className="pt-1">
              <Toggle value={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} disabled={props.disabled} />
            </div>
          </Field>
        </div>
        <div className="pt-3 flex gap-2">
          <button type="button" disabled={props.disabled} onClick={() => props.onUpsert(draft)} className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-60">
            Guardar nivel
          </button>
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => setDraft({ slug: "", name: "", min_points: 0, badge_label: "", badge_message: "", dot_color: "", sort_order: 0, is_active: true })}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-60"
          >
            Nuevo
          </button>
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold">Niveles actuales</div>
        <div className="divide-y">
          {props.tiers.map((t) => (
            <button key={t.id ?? t.slug} type="button" onClick={() => setDraft({ ...t, badge_label: t.badge_label ?? t.badge_text ?? "", badge_message: t.badge_message ?? t.badge_text ?? "" })} className="w-full text-left px-4 py-3 hover:bg-neutral-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{t.name} <span className="text-xs text-neutral-500">({t.slug})</span></div>
                  <div className="text-sm text-neutral-600">min {t.min_points} · {t.badge_label ?? t.badge_text ?? "—"} · {t.badge_message ?? t.badge_text ?? "—"}</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full border ${t.is_active ? "bg-black text-white border-black" : "bg-white"}`}>{t.is_active ? "Activo" : "Inactivo"}</div>
              </div>
            </button>
          ))}
          {props.tiers.length === 0 && <div className="px-4 py-4 text-sm text-neutral-500">No hay niveles todavía.</div>}
        </div>
      </div>
    </div>
  );
}

function RewardEditor(props: { rewards: Reward[]; disabled?: boolean; onUpsert: (reward: Reward) => void }) {
  const [draft, setDraft] = useState<Reward>({
    title: "Café gratis",
    description: "Canjeá por un café de cortesía",
    cost_points: 100,
    is_global: true,
    cafe_id: null,
    is_active: true,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4">
        <div className="text-sm font-semibold mb-3">Crear / editar beneficio</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Título">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} disabled={props.disabled} />
          </Field>
          <Field label="Costo (cafecitos)">
            <Input type="number" min={0} value={draft.cost_points} onChange={(e) => setDraft({ ...draft, cost_points: Number(e.target.value) })} disabled={props.disabled} />
          </Field>
          <Field label="Estado">
            <div className="pt-1">
              <Toggle value={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} disabled={props.disabled} />
            </div>
          </Field>
          <div className="md:col-span-3">
            <Field label="Descripción">
              <Textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} disabled={props.disabled} rows={2} />
            </Field>
          </div>
          <Field label="Global">
            <div className="pt-1">
              <Toggle value={draft.is_global} onChange={(v) => setDraft({ ...draft, is_global: v })} disabled={props.disabled} />
            </div>
          </Field>
          <Field label="Cafe ID (si no es global)" hint="Dejalo vacío por ahora.">
            <Input value={draft.cafe_id ?? ""} onChange={(e) => setDraft({ ...draft, cafe_id: e.target.value || null })} disabled={props.disabled} />
          </Field>
        </div>
        <div className="pt-3 flex gap-2">
          <button type="button" disabled={props.disabled} onClick={() => props.onUpsert(draft)} className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-60">
            Guardar beneficio
          </button>
          <button type="button" disabled={props.disabled} onClick={() => setDraft({ title: "", description: "", cost_points: 0, is_global: true, cafe_id: null, is_active: true })} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-60">
            Nuevo
          </button>
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold">Beneficios actuales</div>
        <div className="divide-y">
          {props.rewards.map((r) => (
            <button key={r.id ?? r.title} type="button" onClick={() => setDraft(r)} className="w-full text-left px-4 py-3 hover:bg-neutral-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-sm text-neutral-600">{r.cost_points} cafecitos · {r.is_global ? "Global" : "Por cafetería"} · {r.description ?? "—"}</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full border ${r.is_active ? "bg-black text-white border-black" : "bg-white"}`}>{r.is_active ? "Activo" : "Inactivo"}</div>
              </div>
            </button>
          ))}
          {props.rewards.length === 0 && <div className="px-4 py-4 text-sm text-neutral-500">No hay beneficios todavía.</div>}
        </div>
      </div>
    </div>
  );
}

function SociosPanel(props: {
  profiles: ProfileRow[];
  tiers: { id: string; name: string }[];
  disabled?: boolean;
  onSetActive: (profile_id: string, is_active: boolean) => void;
  onSetTier: (profile_id: string, tier_id: string) => void;
  onResetPin: (cedula: string, pin: string) => void;
}) {
  const [q, setQ] = useState("");
  const [pinCedula, setPinCedula] = useState("");
  const [pinNew, setPinNew] = useState("");

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return props.profiles;
    return props.profiles.filter((p) => {
      const name = (p.full_name ?? "").toLowerCase();
      const ced = (p.cedula ?? "").toLowerCase();
      return name.includes(qq) || ced.includes(qq) || (p.role ?? "").toLowerCase().includes(qq);
    });
  }, [q, props.profiles]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
        <Field label="Buscar socio">
          <Input placeholder="Nombre, cédula o rol..." value={q} onChange={(e) => setQ(e.target.value)} disabled={props.disabled} />
        </Field>
        <div className="rounded-xl border p-3 md:w-[420px]">
          <div className="text-sm font-semibold mb-2">Reset PIN por cédula</div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Cédula" value={pinCedula} onChange={(e) => setPinCedula(e.target.value)} disabled={props.disabled} />
            <Input placeholder="Nuevo PIN (4)" value={pinNew} onChange={(e) => setPinNew(e.target.value)} disabled={props.disabled} />
          </div>
          <button
            type="button"
            disabled={props.disabled || pinCedula.trim().length < 6 || pinNew.trim().length !== 4}
            onClick={() => props.onResetPin(pinCedula.trim(), pinNew.trim())}
            className="mt-2 w-full rounded-lg bg-black text-white px-3 py-2 text-sm disabled:opacity-60"
          >
            Aplicar PIN
          </button>
          <div className="mt-1 text-xs text-neutral-500">Tip: esto permite ayudar rápido al cliente sin borrar su cuenta.</div>
        </div>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold">Listado (máx 200)</div>
        <div className="divide-y">
          {list.map((p) => (
            <div key={p.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-semibold">{p.full_name ?? "Sin nombre"} <span className="text-xs text-neutral-500">· {p.role}</span></div>
                <div className="text-sm text-neutral-600">Cédula: {p.cedula ?? "—"} · Tel: {p.phone ?? "—"}</div>
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <select className="rounded-lg border px-3 py-2 text-sm" disabled={props.disabled} value={p.tier_id ?? ""} onChange={(e) => props.onSetTier(p.id, e.target.value)}>
                  {props.tiers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={props.disabled}
                  onClick={() => props.onSetActive(p.id, !(p.is_active ?? true))}
                  className={`rounded-lg px-3 py-2 text-sm border ${(p.is_active ?? true) ? "bg-white" : "bg-black text-white border-black"} disabled:opacity-60`}
                >
                  {(p.is_active ?? true) ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="px-4 py-4 text-sm text-neutral-500">No hay resultados.</div>}
        </div>
      </div>
    </div>
  );
}

function CafesPanel(props: { cafes: CafeRow[]; disabled?: boolean; onSetActive: (cafe_id: string, is_active: boolean) => void }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b text-sm font-semibold">Listado (máx 200)</div>
      <div className="divide-y">
        {props.cafes.map((c) => (
          <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{c.name ?? "Sin nombre"}</div>
              <div className="text-xs text-neutral-500">ID: {c.id}</div>
            </div>
            <button
              type="button"
              disabled={props.disabled}
              onClick={() => props.onSetActive(c.id, !(c.is_active ?? true))}
              className={`rounded-lg px-3 py-2 text-sm border ${(c.is_active ?? true) ? "bg-white" : "bg-black text-white border-black"} disabled:opacity-60`}
            >
              {(c.is_active ?? true) ? "Desactivar" : "Activar"}
            </button>
          </div>
        ))}
        {props.cafes.length === 0 && <div className="px-4 py-4 text-sm text-neutral-500">No hay cafeterías.</div>}
      </div>
    </div>
  );
}
