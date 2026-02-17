"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

/** Filas del view v_report_cafes_30d_all (todas las cafeterías, 30d, incl. 0 movimientos) */
export type VReportCafes30dAllRow = {
  cafe_id: string;
  cafeteria: string;
  image_code: string | null;
  is_active: boolean;
  movimientos: number;
  generado: number;
  canjeado: number;
  neto: number;
};

export type CafeKpiRow = {
  cafe_id: string;
  cafe_nombre: string | null;
  movimientos: number;
  generado: number;
  canjeado: number;
  neto: number;
  tasa_canje: number;
  image_code?: string | null;
  is_active?: boolean;
};

export type TopCustomerRow = {
  cafe_id: string;
  cafe_nombre: string | null;
  profile_id: string;
  movimientos: number;
  generado: number;
  canjeado: number;
  neto: number;
};

export type DailyKpiRow = {
  fecha: string;
  movimientos: number;
  generado: number;
  canjeado: number;
  neto: number;
};

export type KpisSummaryRow = {
  movimientos_30d: number;
  earn_30d: number;
  redeem_30d: number;
  generado_30d: number;
  canjeado_30d: number;
  neto_30d: number;
  cafes_activas_30d: number;
  clientes_activos_30d: number;
};

export type TopConsumer7dRow = {
  profile_id: string;
  full_name: string | null;
  cedula: string | null;
  movimientos: number;
  generado: number;
  canjeado: number;
  neto: number;
};

export type AlertRow = {
  cafe_id: string;
  cafe_nombre: string | null;
  mov_7d: number;
  mov_prev_7d: number;
  delta_mov: number;
  delta_mov_pct: number;
  neto_7d: number;
};

export type CafeDetailKpisRow = {
  movimientos_30d: number;
  generado_30d: number;
  canjeado_30d: number;
  neto_30d: number;
  clientes_unicos_30d: number;
};

export type TopClienteGlobalRow = {
  cafe_id: string;
  cafe_nombre: string | null;
  profile_id: string;
  cliente_nombre: string;
  movimientos: number;
  generado: number;
  canjeado: number;
  neto: number;
};

export type PanelClienteGlobalRow = {
  cliente_id: string;
  cliente: string;
  cafe_preferida_id: string | null;
  cafeteria_preferida: string;
  movimientos: number;
  generado: number;
  canjeado: number;
  neto: number;
};

async function adminGuard() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.role !== "admin") throw new Error("Solo admin");
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Rendimiento por cafetería (30 días). Fuente: view v_report_cafes_30d_all (todas las cafeterías, incl. 0 movimientos). */
export async function getAdminCafeKpis30d(): Promise<CafeKpiRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("v_report_cafes_30d_all")
    .select("cafe_id, cafeteria, image_code, is_active, movimientos, generado, canjeado, neto");

  if (error) {
    console.error("getAdminCafeKpis30d", error);
    return [];
  }

  const viewRows = (data ?? []) as VReportCafes30dAllRow[];
  const rows: CafeKpiRow[] = viewRows.map((row) => {
    const generado = num(row.generado);
    const canjeado = num(row.canjeado);
    const neto = num(row.neto);
    const tasa_canje =
      generado === 0 ? 0 : Math.round((canjeado / generado) * 100) / 100;
    return {
      cafe_id: row.cafe_id ?? "",
      cafe_nombre: row.cafeteria ?? null,
      movimientos: num(row.movimientos),
      generado,
      canjeado,
      neto,
      tasa_canje,
      image_code: row.image_code ?? null,
      is_active: row.is_active ?? true,
    };
  });

  rows.sort((a, b) => b.neto - a.neto || b.generado - a.generado);
  return rows;
}

export async function getAdminTopCustomers(limit = 50): Promise<TopCustomerRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("cafe_id, from_profile_id, to_profile_id, amount");

  if (error) {
    console.error("getAdminTopCustomers", error);
    return [];
  }

  const cafesIds = [...new Set((txs ?? []).map((t) => t.cafe_id).filter(Boolean))] as string[];
  const cafesMap: Record<string, string> = {};
  if (cafesIds.length > 0) {
    const { data: cafes } = await supabase.from("cafes").select("id, name").in("id", cafesIds);
    for (const c of cafes ?? []) {
      cafesMap[c.id] = (c as { name?: string }).name ?? "";
    }
  }

  type Key = string;
  const byKey: Record<Key, { movimientos: number; generado: number; canjeado: number }> = {};

  for (const t of txs ?? []) {
    const cid = t.cafe_id ?? "";
    if (!cid) continue;
    const amt = num(t.amount);
    if (t.to_profile_id) {
      const k: Key = `${cid}:${t.to_profile_id}`;
      if (!byKey[k]) byKey[k] = { movimientos: 0, generado: 0, canjeado: 0 };
      byKey[k].movimientos += 1;
      byKey[k].generado += amt;
    }
    if (t.from_profile_id) {
      const k: Key = `${cid}:${t.from_profile_id}`;
      if (!byKey[k]) byKey[k] = { movimientos: 0, generado: 0, canjeado: 0 };
      byKey[k].movimientos += 1;
      byKey[k].canjeado += amt;
    }
  }

  const rows: TopCustomerRow[] = Object.entries(byKey).map(([key, v]) => {
    const [cafe_id, profile_id] = key.split(":");
    return {
      cafe_id,
      cafe_nombre: cafesMap[cafe_id] ?? null,
      profile_id,
      movimientos: v.movimientos,
      generado: v.generado,
      canjeado: v.canjeado,
      neto: v.generado - v.canjeado,
    };
  });

  rows.sort((a, b) => b.generado - a.generado);
  return rows.slice(0, limit);
}

export async function getAdminDailyKpis(days = 30): Promise<DailyKpiRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("from_profile_id, to_profile_id, amount, created_at")
    .gte("created_at", sinceIso);

  if (error) {
    console.error("getAdminDailyKpis", error);
    return [];
  }

  const byDate: Record<string, { movimientos: number; generado: number; canjeado: number }> = {};

  for (const t of txs ?? []) {
    const d = (t.created_at as string).slice(0, 10);
    if (!byDate[d]) byDate[d] = { movimientos: 0, generado: 0, canjeado: 0 };
    byDate[d].movimientos += 1;
    const amt = num(t.amount);
    if (t.to_profile_id) byDate[d].generado += amt;
    if (t.from_profile_id) byDate[d].canjeado += amt;
  }

  const rows: DailyKpiRow[] = Object.entries(byDate).map(([fecha, v]) => ({
    fecha,
    movimientos: v.movimientos,
    generado: v.generado,
    canjeado: v.canjeado,
    neto: v.generado - v.canjeado,
  }));

  rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return rows;
}

export async function getAdminKpisSummary(days = 30): Promise<KpisSummaryRow> {
  await adminGuard();
  const supabase = supabaseAdmin();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("cafe_id, to_profile_id, from_profile_id, amount, tx_type")
    .gte("created_at", sinceIso);

  if (error) {
    console.error("getAdminKpisSummary", error);
    return {
      movimientos_30d: 0,
      earn_30d: 0,
      redeem_30d: 0,
      generado_30d: 0,
      canjeado_30d: 0,
      neto_30d: 0,
      cafes_activas_30d: 0,
      clientes_activos_30d: 0,
    };
  }

  const rows = txs ?? [];
  const movimientos_30d = rows.length;
  const earn_30d = rows.filter((t) => (t as { tx_type?: string }).tx_type === "earn").length;
  const redeem_30d = rows.filter((t) => (t as { tx_type?: string }).tx_type === "redeem").length;
  let generado_30d = 0;
  let canjeado_30d = 0;
  const cafeIds = new Set<string>();
  const profileIds = new Set<string>();

  for (const t of rows) {
    const amt = num(t.amount);
    const txType = (t as { tx_type?: string }).tx_type;
    if (txType === "earn" && t.to_profile_id) {
      generado_30d += amt;
      profileIds.add(t.to_profile_id);
    }
    if (txType === "redeem" && t.from_profile_id) {
      canjeado_30d += amt;
    }
    if (t.cafe_id) cafeIds.add(t.cafe_id);
    if (t.to_profile_id) profileIds.add(t.to_profile_id);
  }

  return {
    movimientos_30d,
    earn_30d,
    redeem_30d,
    generado_30d,
    canjeado_30d,
    neto_30d: generado_30d - canjeado_30d,
    cafes_activas_30d: cafeIds.size,
    clientes_activos_30d: profileIds.size,
  };
}

export async function getAdminTopConsumers7d(limit = 20): Promise<TopConsumer7dRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("to_profile_id, from_profile_id, amount, tx_type")
    .gte("created_at", sinceIso);

  if (error) {
    console.error("getAdminTopConsumers7d", error);
    return [];
  }

  const byProfile: Record<string, { movimientos: number; generado: number; canjeado: number }> = {};

  for (const t of txs ?? []) {
    const txType = (t as { tx_type?: string }).tx_type;
    const amt = num(t.amount);
    if (t.to_profile_id && txType === "earn") {
      const pid = t.to_profile_id;
      if (!byProfile[pid]) byProfile[pid] = { movimientos: 0, generado: 0, canjeado: 0 };
      byProfile[pid].movimientos += 1;
      byProfile[pid].generado += amt;
    }
    if (t.from_profile_id && txType === "redeem") {
      const pid = t.from_profile_id;
      if (!byProfile[pid]) byProfile[pid] = { movimientos: 0, generado: 0, canjeado: 0 };
      byProfile[pid].movimientos += 1;
      byProfile[pid].canjeado += amt;
    }
  }

  const profileIds = Object.keys(byProfile);
  const profilesMap: Record<string, { full_name: string | null; cedula: string | null }> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, cedula")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      const id = (p as { id: string }).id;
      profilesMap[id] = {
        full_name: (p as { full_name?: string }).full_name ?? null,
        cedula: (p as { cedula?: string }).cedula ?? null,
      };
    }
  }

  const out: TopConsumer7dRow[] = Object.entries(byProfile).map(([profile_id, v]) => ({
    profile_id,
    full_name: profilesMap[profile_id]?.full_name ?? null,
    cedula: profilesMap[profile_id]?.cedula ?? null,
    movimientos: v.movimientos,
    generado: v.generado,
    canjeado: v.canjeado,
    neto: v.generado - v.canjeado,
  }));

  out.sort((a, b) => b.neto - a.neto || b.movimientos - a.movimientos);
  return out.slice(0, limit);
}

export async function getAdminAlerts(limit = 20): Promise<AlertRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();

  const now = new Date();
  const last7 = new Date(now);
  last7.setDate(last7.getDate() - 7);
  const prev7start = new Date(now);
  prev7start.setDate(prev7start.getDate() - 14);

  const [res7, resPrev] = await Promise.all([
    supabase
      .from("point_transactions")
      .select("cafe_id, amount, tx_type")
      .not("cafe_id", "is", null)
      .gte("created_at", last7.toISOString()),
    supabase
      .from("point_transactions")
      .select("cafe_id")
      .not("cafe_id", "is", null)
      .gte("created_at", prev7start.toISOString())
      .lt("created_at", last7.toISOString()),
  ]);

  if (res7.error || resPrev.error) {
    console.error("getAdminAlerts", res7.error ?? resPrev.error);
    return [];
  }

  const byCafe7: Record<string, { mov: number; neto: number }> = {};
  for (const t of res7.data ?? []) {
    const cid = t.cafe_id ?? "";
    if (!byCafe7[cid]) byCafe7[cid] = { mov: 0, neto: 0 };
    byCafe7[cid].mov += 1;
    const amt = num(t.amount);
    const txType = (t as { tx_type?: string }).tx_type;
    if (txType === "earn") byCafe7[cid].neto += amt;
    else if (txType === "redeem") byCafe7[cid].neto -= amt;
  }

  const byCafePrev: Record<string, number> = {};
  for (const t of resPrev.data ?? []) {
    const cid = t.cafe_id ?? "";
    byCafePrev[cid] = (byCafePrev[cid] ?? 0) + 1;
  }

  const cafeIds = [...new Set([...Object.keys(byCafe7), ...Object.keys(byCafePrev)])];
  const cafesMap: Record<string, string> = {};
  if (cafeIds.length > 0) {
    const { data: cafes } = await supabase.from("cafes").select("id, name").in("id", cafeIds);
    for (const c of cafes ?? []) {
      cafesMap[c.id] = (c as { name?: string }).name ?? "";
    }
  }

  const rows: AlertRow[] = [];
  for (const cafe_id of cafeIds) {
    const l = byCafe7[cafe_id] ?? { mov: 0, neto: 0 };
    const p = byCafePrev[cafe_id] ?? 0;
    const mov_7d = l.mov;
    const mov_prev_7d = p;
    const delta_mov = mov_7d - mov_prev_7d;
    const delta_mov_pct =
      mov_prev_7d === 0 ? (mov_7d > 0 ? 100 : 0) : Math.round(((mov_7d - mov_prev_7d) / mov_prev_7d) * 100);
    const neto_7d = l.neto;

    const alert =
      neto_7d < 0 || (mov_prev_7d >= 5 && mov_7d <= mov_prev_7d * 0.6);
    if (alert && (mov_7d > 0 || mov_prev_7d > 0)) {
      rows.push({
        cafe_id,
        cafe_nombre: cafesMap[cafe_id] ?? null,
        mov_7d,
        mov_prev_7d,
        delta_mov,
        delta_mov_pct,
        neto_7d,
      });
    }
  }

  rows.sort((a, b) => a.neto_7d - b.neto_7d || a.delta_mov_pct - b.delta_mov_pct);
  return rows.slice(0, limit);
}

export async function getAdminCafeById(
  cafeId: string
): Promise<{ id: string; name: string; image_code?: string | null } | null> {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("cafes")
    .select("id, name, image_code")
    .eq("id", cafeId)
    .maybeSingle();
  if (error) {
    console.error("getAdminCafeById", error);
    return null;
  }
  if (!data) return null;
  const d = data as { id: string; name?: string; image_code?: string | null };
  return { id: d.id, name: d.name ?? "", image_code: d.image_code ?? null };
}

export type AdminProfileRow = {
  id: string;
  full_name: string | null;
  cedula: string | null;
  role: string | null;
  tier_id: string | null;
};

export async function getAdminProfileById(
  profileId: string
): Promise<AdminProfileRow | null> {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, cedula, role, tier_id")
    .eq("id", profileId)
    .maybeSingle();
  if (error) {
    console.error("getAdminProfileById", error);
    return null;
  }
  if (!data) return null;
  const d = data as { id: string; full_name?: string; cedula?: string; role?: string; tier_id?: string };
  return {
    id: d.id,
    full_name: d.full_name ?? null,
    cedula: d.cedula ?? null,
    role: d.role ?? null,
    tier_id: d.tier_id ?? null,
  };
}

export async function getAdminCafeDetailKpis(
  cafeId: string,
  days = 30
): Promise<CafeDetailKpisRow> {
  await adminGuard();
  const supabase = supabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("to_profile_id, from_profile_id, amount, tx_type")
    .eq("cafe_id", cafeId)
    .gte("created_at", sinceIso);

  if (error) {
    console.error("getAdminCafeDetailKpis", error);
    return {
      movimientos_30d: 0,
      generado_30d: 0,
      canjeado_30d: 0,
      neto_30d: 0,
      clientes_unicos_30d: 0,
    };
  }

  const rows = txs ?? [];
  let generado_30d = 0;
  let canjeado_30d = 0;
  const clientesUnicos = new Set<string>();

  for (const t of rows) {
    const amt = num(t.amount);
    const txType = (t as { tx_type?: string }).tx_type;
    if (txType === "earn" && t.to_profile_id) {
      generado_30d += amt;
      clientesUnicos.add(t.to_profile_id);
    }
    if (txType === "redeem" && t.from_profile_id) {
      canjeado_30d += amt;
    }
    if (t.to_profile_id) clientesUnicos.add(t.to_profile_id);
  }

  return {
    movimientos_30d: rows.length,
    generado_30d,
    canjeado_30d,
    neto_30d: generado_30d - canjeado_30d,
    clientes_unicos_30d: clientesUnicos.size,
  };
}

export async function getAdminCafeDailyKpis(
  cafeId: string,
  days = 30
): Promise<DailyKpiRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("from_profile_id, to_profile_id, amount, created_at")
    .eq("cafe_id", cafeId)
    .gte("created_at", sinceIso);

  if (error) {
    console.error("getAdminCafeDailyKpis", error);
    return [];
  }

  const byDate: Record<string, { movimientos: number; generado: number; canjeado: number }> = {};

  for (const t of txs ?? []) {
    const d = (t.created_at as string).slice(0, 10);
    if (!byDate[d]) byDate[d] = { movimientos: 0, generado: 0, canjeado: 0 };
    byDate[d].movimientos += 1;
    const amt = num(t.amount);
    if (t.to_profile_id) byDate[d].generado += amt;
    if (t.from_profile_id) byDate[d].canjeado += amt;
  }

  const rows: DailyKpiRow[] = Object.entries(byDate).map(([fecha, v]) => ({
    fecha,
    movimientos: v.movimientos,
    generado: v.generado,
    canjeado: v.canjeado,
    neto: v.generado - v.canjeado,
  }));

  rows.sort((a, b) => b.fecha.localeCompare(a.fecha));
  return rows.slice(0, days);
}

export async function getAdminCafeTopClients7d(
  cafeId: string,
  limit = 20
): Promise<TopConsumer7dRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("to_profile_id, from_profile_id, amount, tx_type")
    .eq("cafe_id", cafeId)
    .gte("created_at", sinceIso);

  if (error) {
    console.error("getAdminCafeTopClients7d", error);
    return [];
  }

  const byProfile: Record<string, { movimientos: number; generado: number; canjeado: number }> = {};

  for (const t of txs ?? []) {
    const txType = (t as { tx_type?: string }).tx_type;
    const amt = num(t.amount);
    if (t.to_profile_id && txType === "earn") {
      const pid = t.to_profile_id;
      if (!byProfile[pid]) byProfile[pid] = { movimientos: 0, generado: 0, canjeado: 0 };
      byProfile[pid].movimientos += 1;
      byProfile[pid].generado += amt;
    }
    if (t.from_profile_id && txType === "redeem") {
      const pid = t.from_profile_id;
      if (!byProfile[pid]) byProfile[pid] = { movimientos: 0, generado: 0, canjeado: 0 };
      byProfile[pid].movimientos += 1;
      byProfile[pid].canjeado += amt;
    }
  }

  const profileIds = Object.keys(byProfile);
  const profilesMap: Record<string, { full_name: string | null; cedula: string | null }> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, cedula")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      const id = (p as { id: string }).id;
      profilesMap[id] = {
        full_name: (p as { full_name?: string }).full_name ?? null,
        cedula: (p as { cedula?: string }).cedula ?? null,
      };
    }
  }

  const out: TopConsumer7dRow[] = Object.entries(byProfile).map(([profile_id, v]) => ({
    profile_id,
    full_name: profilesMap[profile_id]?.full_name ?? null,
    cedula: profilesMap[profile_id]?.cedula ?? null,
    movimientos: v.movimientos,
    generado: v.generado,
    canjeado: v.canjeado,
    neto: v.generado - v.canjeado,
  }));

  out.sort((a, b) => b.neto - a.neto || b.movimientos - a.movimientos);
  return out.slice(0, limit);
}

export async function getAdminTopClientesGlobal(
  limit = 50
): Promise<TopClienteGlobalRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("cafe_id, to_profile_id, from_profile_id, amount, tx_type")
    .gte("created_at", sinceIso)
    .not("cafe_id", "is", null)
    .not("to_profile_id", "is", null);

  if (error) {
    console.error("getAdminTopClientesGlobal", error);
    return [];
  }

  type Key = string;
  const byKey: Record<
    Key,
    { movimientos: number; generado: number; canjeado: number }
  > = {};

  for (const t of txs ?? []) {
    const cid = t.cafe_id ?? "";
    const pid = t.to_profile_id ?? "";
    if (!cid || !pid) continue;
    const k: Key = `${cid}:${pid}`;
    if (!byKey[k]) byKey[k] = { movimientos: 0, generado: 0, canjeado: 0 };
    const amt = num(t.amount);
    const txType = (t as { tx_type?: string }).tx_type;
    byKey[k].movimientos += 1;
    if (txType === "earn") byKey[k].generado += amt;
    if (txType === "redeem") byKey[k].canjeado += amt;
  }

  const cafeIds = [...new Set(Object.keys(byKey).map((k) => k.split(":")[0]))];
  const profileIds = [...new Set(Object.keys(byKey).map((k) => k.split(":")[1]))];

  const [cafesRes, profilesRes] = await Promise.all([
    cafeIds.length > 0
      ? supabase.from("cafes").select("id, name").in("id", cafeIds)
      : Promise.resolve({ data: [] }),
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name, cedula").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const cafesMap: Record<string, string> = {};
  for (const c of cafesRes.data ?? []) {
    cafesMap[(c as { id: string }).id] = (c as { name?: string }).name ?? "";
  }
  const profilesMap: Record<string, { full_name: string | null; cedula: string | null }> = {};
  for (const p of profilesRes.data ?? []) {
    const id = (p as { id: string }).id;
    profilesMap[id] = {
      full_name: (p as { full_name?: string }).full_name ?? null,
      cedula: (p as { cedula?: string }).cedula ?? null,
    };
  }

  function clienteNombre(profileId: string): string {
    const p = profilesMap[profileId];
    const full = (p?.full_name ?? "").trim();
    const ced = (p?.cedula ?? "").trim();
    if (full) return full;
    if (ced) return ced;
    return "Cliente (sin nombre)";
  }

  const out: TopClienteGlobalRow[] = Object.entries(byKey).map(([key, v]) => {
    const [cafe_id, profile_id] = key.split(":");
    return {
      cafe_id,
      cafe_nombre: cafesMap[cafe_id] ?? null,
      profile_id,
      cliente_nombre: clienteNombre(profile_id),
      movimientos: v.movimientos,
      generado: v.generado,
      canjeado: v.canjeado,
      neto: v.generado - v.canjeado,
    };
  });

  out.sort((a, b) => b.neto - a.neto || b.movimientos - a.movimientos);
  return out.slice(0, limit);
}

export async function getAdminPanelClientesGlobal(): Promise<PanelClienteGlobalRow[]> {
  await adminGuard();
  const supa = supabaseAdmin();
  const { data, error } = await supa.from("v_panel_clientes_global").select("*");
  if (error) {
    const dump = JSON.stringify(error, Object.getOwnPropertyNames(error));
    console.error("getAdminPanelClientesGlobal supabase error:", dump);
    throw new Error("getAdminPanelClientesGlobal supabase error: " + dump);
  }
  const rows = (data ?? []) as any[];
  rows.sort((a, b) => Number(b?.neto ?? 0) - Number(a?.neto ?? 0));
  return rows;
}

// Niveles: tiers de clientes y de cafeterías (para /app/admin/niveles, evita prerender crash)
export type TierRow = {
  id: string;
  slug: string;
  name: string;
  min_points: number;
  badge_label: string | null;
  badge_message: string | null;
  dot_color: string | null;
  sort_order: number;
  is_active: boolean;
};

export type CafeTierRowNiveles = {
  id: string;
  name: string;
  min_total_points: number;
  badge_color: string | null;
  created_at: string | null;
};

export async function getClientTiers(): Promise<TierRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("tiers")
    .select("id,slug,name,min_points,badge_label,badge_message,dot_color,sort_order,is_active")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("getClientTiers", error);
    return [];
  }
  return (data ?? []) as TierRow[];
}

export async function getCafeTiers(): Promise<CafeTierRowNiveles[]> {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("cafe_tiers")
    .select("id,name,min_total_points,badge_color,created_at")
    .order("min_total_points", { ascending: true });
  if (error) {
    console.error("getCafeTiers", error);
    return [];
  }
  return (data ?? []) as CafeTierRowNiveles[];
}
