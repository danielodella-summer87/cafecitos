// src/app/actions/owner.ts
"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  cedula: z.string().min(6),
  amount: z.number().int().positive(),
  note: z.string().optional(),
});

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

export async function ownerAddCafecitos(input: FormData | { cedula: string; amount: number; note?: string }) {
  const parsed = schema.parse(normalizeInput(input));

  // 1) validar sesión (debe ser owner con cafetería)
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.role !== "owner") throw new Error("Solo un owner puede asignar cafecitos");

  const actorOwnerProfileId = session.profileId;
  const cafeId = session.cafeId; // IMPORTANTÍSIMO para aislar transacciones por cafetería
  if (!cafeId) throw new Error("Owner sin cafetería asignada (cafe_id).");

  const supabase = supabaseAdmin();

  // 2) buscar consumidor por cédula
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("cedula", parsed.cedula)
    .maybeSingle();

  if (pErr || !profile) throw new Error("No existe un usuario con esa cédula");
  if (profile.role !== "consumer") throw new Error("La cédula no corresponde a un consumidor");

  // 2) Insertar transacción (earn) - cafe_id: session.cafeId (nunca null; validado arriba)
  const { error: tErr } = await supabase.from("point_transactions").insert({
    tx_type: "earn",
    cafe_id: cafeId,
    actor_owner_profile_id: actorOwnerProfileId,
    to_profile_id: profile.id,
    amount: parsed.amount,
    note: parsed.note || "Carga manual",
  });

  if (tErr) {
    console.error("Insert error:", tErr);
    throw new Error(`No se pudo asignar cafecitos: ${tErr.message}`);
  }

  return { ok: true };
}
