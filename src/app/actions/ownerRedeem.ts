"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  cedula: z.string().regex(/^\d{8}$/, "La cédula debe tener exactamente 8 dígitos"),
  amount: z.number().int().positive(),
  note: z.string().optional(),
});

type Tx = {
  id: string;
  tx_type: "earn" | "redeem" | "transfer_out" | "transfer_in" | "adjust";
  from_profile_id: string | null;
  to_profile_id: string | null;
  amount: number;
};

function normalizeCedula(input: unknown) {
  return String(input ?? "").trim().replace(/\D/g, "");
}

function normalizeInput(input: unknown): { cedula: string; amount: number; note: string } {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    return {
      cedula: normalizeCedula(input.get("cedula")),
      amount: Number(input.get("amount") ?? 0),
      note: String(input.get("note") ?? "").trim(),
    };
  }
  if (input && typeof input === "object" && "cedula" in input) {
    const o = input as { cedula?: unknown; amount?: unknown; note?: unknown };
    return {
      cedula: normalizeCedula(o.cedula),
      amount: Number(o.amount ?? 0),
      note: String(o.note ?? "").trim(),
    };
  }
  throw new Error("Input inválido");
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

/** Saldo global del consumidor (todas las point_transactions del perfil, sin filtrar por cafe_id). */
async function getGlobalBalance(
  supabase: ReturnType<typeof supabaseAdmin>,
  profileId: string
): Promise<number> {
  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("id, tx_type, from_profile_id, to_profile_id, amount")
    .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) return 0;
  const typed = (txs ?? []) as Tx[];
  return computeBalance(profileId, typed);
}

export type OwnerRedeemResult = { ok: true } | { ok: false; error: string };

export async function ownerRedeemCafecitos(
  input: FormData | { cedula: string; amount: number; note?: string; debug?: boolean }
): Promise<OwnerRedeemResult> {
  const parsed = schema.safeParse(normalizeInput(input));
  if (!parsed.success) {
    return { ok: false, error: "Cédula y cantidad válidas son requeridas" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "No autenticado" };
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return { ok: false, error: "Sin cafetería asignada" };

  let actorOwnerProfileId: string | null = null;

  if (session.role === "owner") {
    const { getOwnerContext } = await import("@/app/actions/ownerContext");
    const ctx = await getOwnerContext();
    if (!ctx) return { ok: false, error: "Sin cafetería asignada" };
    if (!ctx.capabilities.canRedeem) return { ok: false, error: "No tenés permiso para cobrar/canjear cafecitos" };
    actorOwnerProfileId = session.profileId ?? null;
  } else if (session.role === "staff") {
    if (session.can_redeem !== true) return { ok: false, error: "No tenés permiso para cobrar/canjear cafecitos" };
  } else {
    return { ok: false, error: "Solo dueño o staff pueden canjear" };
  }

  const supabase = supabaseAdmin();

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("cedula", parsed.data.cedula)
    .maybeSingle();

  if (pErr || !profile) return { ok: false, error: "No existe un usuario con esa cédula" };
  if (profile.role !== "consumer") return { ok: false, error: "La cédula no corresponde a un consumidor" };

  if (session.role === "staff" && session.cafeId === cafeId) {
    let staffProfileId: string | null = session.profileId ?? null;
    if (!staffProfileId && session.staffId) {
      const { data: staffRow } = await supabase
        .from("cafe_staff")
        .select("profile_id")
        .eq("id", session.staffId)
        .maybeSingle();
      staffProfileId = (staffRow as { profile_id?: string | null } | null)?.profile_id ?? null;
    }
    if (staffProfileId === profile.id) {
      return { ok: false, error: "No podés canjear tus propios cafecitos en tu propia cafetería." };
    }
  }

  const consumerId = profile.id;
  const balance = await getGlobalBalance(supabase, consumerId);

  if (balance < parsed.data.amount) {
    return { ok: false, error: "Saldo insuficiente" };
  }

  const { error: insertErr } = await supabase.from("point_transactions").insert({
    tx_type: "redeem",
    cafe_id: cafeId,
    actor_owner_profile_id: actorOwnerProfileId,
    from_profile_id: consumerId,
    to_profile_id: null,
    amount: parsed.data.amount,
    note: parsed.data.note || "Canje",
  });

  if (insertErr) {
    console.error("Redeem insert error:", insertErr);
    return { ok: false, error: `No se pudo canjear: ${insertErr.message}` };
  }

  return { ok: true };
}
