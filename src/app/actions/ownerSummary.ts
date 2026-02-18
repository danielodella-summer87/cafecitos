"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  cedula: z.string().min(6),
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

function normalizeCedula(input: unknown) {
  return String(input ?? "").trim().replace(/\D/g, "");
}

function normalizeInput(input: unknown): { cedula: string } {
  // Si viene de un <form action={...}> llega como FormData
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    return { cedula: normalizeCedula(input.get("cedula")) };
  }

  // Si viene como objeto { cedula }
  if (input && typeof input === "object" && "cedula" in (input as Record<string, unknown>)) {
    const o = input as { cedula?: unknown };
    return { cedula: normalizeCedula(o.cedula) };
  }

  // Fallback
  return { cedula: normalizeCedula(undefined) };
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

function computeEarnedInCafe(profileId: string, cafeId: string, txs: Tx[]) {
  // “Generado en mi cafetería”: todo lo que SUMA al socio en ESTE café.
  // (earn + adjust + transfer_in) filtrado por cafe_id y to_profile_id.
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
  const parsed = schema.parse(normalizeInput(input));
  const cedula = parsed.cedula;

  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.role !== "owner" && session.role !== "staff") throw new Error("Solo dueño o staff pueden buscar clientes");

  const cafeId = session.cafeId ?? null;
  if (!cafeId) throw new Error("Sin cafetería asignada (cafe_id).");

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

  const supabase = supabaseAdmin();

  // 2) buscar consumidor
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
    };
  }

  // 3) transacciones globales del consumidor (solo para saldo; sin filtrar por café)
  const { data: txs, error: tErr } = await supabase
    .from("point_transactions")
    .select("id, tx_type, actor_owner_profile_id, from_profile_id, to_profile_id, cafe_id, amount, note, created_at")
    .or(`from_profile_id.eq.${profile.id},to_profile_id.eq.${profile.id}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (tErr) throw tErr;

  const typed = (txs ?? []) as Tx[];
  const balance = computeBalance(profile.id, typed);

  // 4) Query con .eq("cafe_id", cafeId): últimos movimientos / generado / canjeado en MI cafetería
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

  return {
    profile,
    balance,
    earnedInThisCafe,
    redeemedInThisCafe,
    availableInThisCafe,
    last: lastInMyCafe,
    redeemedTotalGlobal,
    error: null,
  };
}