"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  cedula: z.string().min(6),
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

export type OwnerRedeemResult = { ok: true } | { ok: false; error: string };

export async function ownerRedeemCafecitos(
  input: FormData | { cedula: string; amount: number; note?: string }
): Promise<OwnerRedeemResult> {
  const parsed = schema.safeParse(normalizeInput(input));
  if (!parsed.success) {
    return { ok: false, error: "Cédula y cantidad válidas son requeridas" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "No autenticado" };
  if (session.role !== "owner") return { ok: false, error: "Solo un owner puede canjear" };

  const cafeId = session.cafeId;
  if (!cafeId) return { ok: false, error: "Owner sin cafetería asignada (cafe_id)." };

  const supabase = supabaseAdmin();

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("cedula", parsed.data.cedula)
    .maybeSingle();

  if (pErr || !profile) return { ok: false, error: "No existe un usuario con esa cédula" };
  if (profile.role !== "consumer") return { ok: false, error: "La cédula no corresponde a un consumidor" };

  const consumerId = profile.id;

  const { data: txs, error: tErr } = await supabase
    .from("point_transactions")
    .select("id, tx_type, from_profile_id, to_profile_id, amount")
    .or(`from_profile_id.eq.${consumerId},to_profile_id.eq.${consumerId}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (tErr) return { ok: false, error: "Error al consultar saldo" };

  const typed = (txs ?? []) as Tx[];
  const balance = computeBalance(consumerId, typed);

  if (balance < parsed.data.amount) {
    return { ok: false, error: `Saldo insuficiente (tiene ${balance})` };
  }

  const { error: insertErr } = await supabase.from("point_transactions").insert({
    tx_type: "redeem",
    cafe_id: cafeId,
    actor_owner_profile_id: session.profileId,
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
