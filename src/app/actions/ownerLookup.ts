"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  cedula: z.string().regex(/^\d{8}$/, "La cédula debe tener exactamente 8 dígitos"),
});

export async function ownerLookupConsumer(input: unknown) {
  const { cedula } = schema.parse(input);

  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.role !== "owner") throw new Error("Solo un owner puede buscar consumidores");
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx) throw new Error("Sin cafetería asignada");
  if (!ctx.capabilities.canIssue && !ctx.capabilities.canRedeem) throw new Error("No tenés permiso para buscar clientes");

  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, cedula, role")
    .eq("cedula", cedula)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return data; // puede ser owner/consumer, lo validamos en UI
}
