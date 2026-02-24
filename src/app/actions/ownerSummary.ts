"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  cedula: z.string().regex(/^\d{8}$/, "La cédula debe tener exactamente 8 dígitos"),
});

type Tx = {
  id: string;
  tx_type: "earn" | "redeem" | "transfer_out" | "transfer_in" | "adjust";
  actor_owner_profile_id: string | null;
  from_profile_id: string | null;
  to_profile_id: string | null;
  cafe_id: string | null;
  amount: number;
  note: string | null;
  created_at: string;
};

type BalanceMeta = {
  balance: number;
  txCount: number;
  nullCafeIdCount: number;
  typesCount: Record<string, number>;
  last5: Array<{ type: string; amount: number; cafe_id: string | null; created_at: string | null }>;
};

function normalizeCedula(input: unknown) {
  return String(input ?? "").trim().replace(/\D/g, "");
}

function normalizeInput(input: unknown): { cedula: string; debug?: boolean } {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    return { cedula: normalizeCedula(input.get("cedula")) };
  }
  if (input && typeof input === "object" && "cedula" in (input as Record<string, unknown>)) {
    const o = input as { cedula?: unknown; debug?: unknown };
    return {
      cedula: normalizeCedula(o.cedula),
      debug: o.debug === true,
    };
  }
  return { cedula: normalizeCedula(undefined) };
}

function getDebugFlag(input: unknown): boolean {
  if (input && typeof input === "object" && "debug" in (input as Record<string, unknown>)) {
    return (input as { debug?: boolean }).debug === true;
  }
  return false;
}

function computeBalance(profileId: string, txs: Tx[]) {
  let balance = 0;
  for (const t of txs) {
    const toId = t.to_profile_id ?? null;
    const fromId = t.from_profile_id ?? null;
    switch (t.tx_type) {
      case "earn":
      case "adjust":
      case "transfer_in":
        if (toId === profileId) balance += Number(t.amount ?? 0);
        break;
      case "redeem":
      case "transfer_out":
        if (fromId === profileId) balance -= Number(t.amount ?? 0);
        break;
    }
  }
  return balance;
}

function buildBalanceMeta(profileId: string, txs: Tx[]): BalanceMeta {
  const balance = computeBalance(profileId, txs);
  let nullCafeIdCount = 0;
  const typesCount: Record<string, number> = {};
  for (const t of txs) {
    if (t.cafe_id == null) nullCafeIdCount++;
    const k = t.tx_type ?? "unknown";
    typesCount[k] = (typesCount[k] ?? 0) + 1;
  }
  const last5 = txs.slice(0, 5).map((t) => ({
    type: t.tx_type,
    amount: Number(t.amount ?? 0),
    cafe_id: t.cafe_id ?? null,
    created_at: t.created_at ?? null,
  }));
  return { balance, txCount: txs.length, nullCafeIdCount, typesCount, last5 };
}

async function getGlobalBalanceWithMeta(
  supabase: ReturnType<typeof supabaseAdmin>,
  profileId: string
): Promise<BalanceMeta> {
  try {
    const { data: txs, error } = await supabase
      .from("point_transactions")
      .select("id, tx_type, from_profile_id, to_profile_id, amount, cafe_id, created_at")
      .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) return { balance: 0, txCount: 0, nullCafeIdCount: 0, typesCount: {}, last5: [] };
    return buildBalanceMeta(profileId, (txs ?? []) as Tx[]);
  } catch {
    return { balance: 0, txCount: 0, nullCafeIdCount: 0, typesCount: {}, last5: [] };
  }
}

async function getCafeBalanceWithMeta(
  supabase: ReturnType<typeof supabaseAdmin>,
  profileId: string,
  cafeId: string
): Promise<BalanceMeta> {
  try {
    const { data: txs, error } = await supabase
      .from("point_transactions")
      .select("id, tx_type, from_profile_id, to_profile_id, amount, cafe_id, created_at")
      .eq("cafe_id", cafeId)
      .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) return { balance: 0, txCount: 0, nullCafeIdCount: 0, typesCount: {}, last5: [] };
    return buildBalanceMeta(profileId, (txs ?? []) as Tx[]);
  } catch {
    return { balance: 0, txCount: 0, nullCafeIdCount: 0, typesCount: {}, last5: [] };
  }
}

function computeEarnedInCafe(profileId: string, cafeId: string, txs: Tx[]) {
  let total = 0;
  for (const t of txs) {
    const isInCafe = t.cafe_id === cafeId;
    const isToMe = t.to_profile_id === profileId;
    if (!isInCafe || !isToMe) continue;
    if (t.tx_type === "earn" || t.tx_type === "adjust" || t.tx_type === "transfer_in") {
      total += t.amount;
    }
  }
  return total;
}

export async function ownerGetConsumerSummary(input: unknown) {
  const normalized = normalizeInput(input);
  const parsed = schema.parse({ cedula: normalized.cedula });
  const cedula = parsed.cedula;
  const wantDebug = getDebugFlag(input) === true;

  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.role !== "owner" && session.role !== "staff") throw new Error("Solo dueño o staff pueden buscar clientes");

  const cafeId = session.cafeId ?? null;
  if (!cafeId) throw new Error("Sin cafetería asignada (cafe_id).");

  const supabase = supabaseAdmin();
  let crossCafeRedeem = true;
  const { data: settingsRow } = await supabase
    .from("settings_global")
    .select("allow_cross_cafe_redeem")
    .eq("id", true)
    .maybeSingle();
  if (settingsRow && typeof (settingsRow as { allow_cross_cafe_redeem?: unknown }).allow_cross_cafe_redeem === "boolean") {
    crossCafeRedeem = (settingsRow as { allow_cross_cafe_redeem: boolean }).allow_cross_cafe_redeem;
  }

  let canIssue = false;
  let canRedeem = false;
  if (session.role === "owner") {
    const { getOwnerContext } = await import("@/app/actions/ownerContext");
    const ctx = await getOwnerContext();
    if (!ctx) throw new Error("Sin cafetería asignada");
    canIssue = ctx.capabilities.canIssue;
    canRedeem = ctx.capabilities.canRedeem;
  } else {
    canIssue = session.can_issue === true;
    canRedeem = session.can_redeem === true;
  }
  if (!canIssue && !canRedeem) throw new Error("No tenés permiso para atender clientes");

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, cedula, role, created_at, phone")
    .eq("cedula", cedula)
    .maybeSingle();

  if (pErr) throw pErr;

  if (!profile) {
    return {
      profile: null,
      balance: 0,
      earnedInThisCafe: 0,
      redeemedInThisCafe: 0,
      availableInThisCafe: 0,
      last: [],
      error: "No existe un usuario con esa cédula",
      cross_cafe_redeem: crossCafeRedeem,
      ...(wantDebug && { debug: null }),
    };
  }

  if (profile.role !== "consumer") {
    return {
      profile,
      balance: 0,
      earnedInThisCafe: 0,
      redeemedInThisCafe: 0,
      availableInThisCafe: 0,
      last: [],
      error: "La cédula existe, pero NO es consumer",
      cross_cafe_redeem: crossCafeRedeem,
      ...(wantDebug && { debug: null }),
    };
  }

  const { data: txs, error: tErr } = await supabase
    .from("point_transactions")
    .select("id, tx_type, actor_owner_profile_id, from_profile_id, to_profile_id, cafe_id, amount, note, created_at")
    .or(`from_profile_id.eq.${profile.id},to_profile_id.eq.${profile.id}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (tErr) throw tErr;

  const typed = (txs ?? []) as Tx[];
  const balance = computeBalance(profile.id, typed);

  const { data: txsMyCafe, error: cafeErr } = await supabase
    .from("point_transactions")
    .select("id, tx_type, from_profile_id, to_profile_id, cafe_id, amount, note, created_at")
    .eq("cafe_id", cafeId)
    .or(`from_profile_id.eq.${profile.id},to_profile_id.eq.${profile.id}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (cafeErr) throw cafeErr;

  const typedMyCafe = (txsMyCafe ?? []) as Tx[];

  const earnedInThisCafe = computeEarnedInCafe(profile.id, cafeId, typedMyCafe);
  const lastInMyCafe = typedMyCafe.slice(0, 10);
  const redeemedInThisCafe = typedMyCafe
    .filter((t) => t.tx_type === "redeem" && t.from_profile_id === profile.id)
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const redeemedTotalGlobal = typed
    .filter((t) => t.tx_type === "redeem" && t.from_profile_id === profile.id)
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const availableInThisCafe = (earnedInThisCafe ?? 0) - (redeemedInThisCafe ?? 0);

  let debug: unknown = undefined;
  if (wantDebug) {
    const [fromTransactionsGlobal, fromTransactionsThisCafe, profileBalanceRow] = await Promise.all([
      getGlobalBalanceWithMeta(supabase, profile.id),
      getCafeBalanceWithMeta(supabase, profile.id, cafeId),
      supabase.from("profiles").select("balance").eq("id", profile.id).maybeSingle(),
    ]);

    const fromProfileColumn =
      profileBalanceRow.error != null
        ? { hasBalanceColumn: false as const }
        : { hasBalanceColumn: true as const, value: (profileBalanceRow.data as { balance?: number } | null)?.balance };

    const cafeBalance = fromTransactionsThisCafe.balance;
    debug = {
      now: new Date().toISOString(),
      profileId: profile.id,
      cafeIdUsedByOwnerPanel: cafeId,
      shown: {
        currentBalance: balance,
        generatedInCafe: earnedInThisCafe,
        redeemedInCafe: redeemedInThisCafe,
      },
      sources: {
        fromTransactionsGlobal,
        fromTransactionsThisCafe,
        fromProfileColumn,
        fromAnySummaryTable: null as { table?: string; value?: unknown } | null,
      },
      diff: {
        shownMinusGlobalTxBalance: balance - fromTransactionsGlobal.balance,
        shownMinusCafeTxBalance: cafeId ? balance - cafeBalance : null,
      },
    };
  }

  return {
    profile,
    balance,
    earnedInThisCafe,
    redeemedInThisCafe,
    availableInThisCafe,
    last: lastInMyCafe,
    redeemedTotalGlobal,
    error: null,
    cross_cafe_redeem: crossCafeRedeem,
    ...(debug !== undefined && { debug }),
  };
}
