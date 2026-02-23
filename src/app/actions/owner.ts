// src/app/actions/owner.ts
"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  cedula: z.string().regex(/^\d{8}$/, "La cédula debe tener exactamente 8 dígitos"),
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

  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  const cafeId = session.cafeId ?? null;
  if (!cafeId) throw new Error("Sin cafetería asignada");

  let canIssue: boolean;
  let actorOwnerProfileId: string | null = null;
  let actorStaffId: string | null = null;

  if (session.role === "owner") {
    const { getOwnerContext } = await import("@/app/actions/ownerContext");
    const ctx = await getOwnerContext();
    if (!ctx) throw new Error("Sin cafetería asignada");
    if (!ctx.capabilities.canIssue) throw new Error("No tenés permiso para asignar cafecitos");
    canIssue = ctx.capabilities.canIssue;
    actorOwnerProfileId = session.profileId ?? null;
  } else if (session.role === "staff") {
    canIssue = session.can_issue === true;
    actorStaffId = session.staffId ?? null;
    if (!canIssue) throw new Error("No tenés permiso para asignar cafecitos");
  } else {
    throw new Error("Solo dueño o staff pueden asignar cafecitos");
  }

  const supabase = supabaseAdmin();

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("cedula", parsed.cedula)
    .maybeSingle();

  if (pErr || !profile) throw new Error("No existe un usuario con esa cédula");
  if (profile.role !== "consumer") throw new Error("La cédula no corresponde a un consumidor");

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
      throw new Error("No podés asignarte cafecitos a vos mismo en tu propia cafetería.");
    }
  }

  const { error: tErr } = await supabase.from("point_transactions").insert({
    tx_type: "earn",
    cafe_id: cafeId,
    actor_owner_profile_id: actorOwnerProfileId,
    actor_staff_id: actorStaffId,
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
