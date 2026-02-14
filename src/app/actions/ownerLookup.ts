"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";

const schema = z.object({
  cedula: z.string().min(6),
});

export async function ownerLookupConsumer(input: unknown) {
  const { cedula } = schema.parse(input);

  const me = await getSessionProfile();
  if (!me) throw new Error("No autenticado");
  if (me.role !== "owner") throw new Error("Solo un owner puede buscar consumidores");

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
