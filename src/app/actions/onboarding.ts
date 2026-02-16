"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function markWelcomeSeen() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ welcome_seen_at: new Date().toISOString() })
    .eq("id", session.profileId);

  if (error) throw new Error(error.message);

  return true;
}
