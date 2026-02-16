"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function markWelcomeSeen() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ welcome_seen_at: new Date().toISOString() })
    .eq("id", session.profileId);

  if (error) {
    const msg = (error as any)?.message ?? "";
    // Evita romper en prod si PostgREST aún no refrescó o la columna no existe momentáneamente
    if (
      msg.includes("schema cache") ||
      msg.includes("welcome_seen_at") ||
      msg.includes("column") ||
      msg.includes("does not exist")
    ) {
      return true;
    }
    throw new Error(msg);
  }

  return true;
}
