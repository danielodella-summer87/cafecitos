"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function markWelcomeSeen(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ welcome_seen_at: new Date().toISOString() })
    .eq("id", session.profileId);

  if (error) {
    const msg = (error as any)?.message ?? "";
    if (msg.includes("welcome_seen_at") || msg.includes("schema cache")) {
      return false;
    }
    console.error("[markWelcomeSeen]", msg);
    return false;
  }

  return true;
}
