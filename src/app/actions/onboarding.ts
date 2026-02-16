"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function markWelcomeSeen() {
  // IMPORTANT: esto jamás debe romper la app ni dejar colgado al usuario.
  try {
    const session = await getSession();
    if (!session?.profileId) return { ok: false, reason: "no-session" };

    const supabase = supabaseAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ welcome_seen_at: new Date().toISOString() })
      .eq("id", session.profileId);

    if (error) return { ok: false, reason: error.message };

    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown";
    return { ok: false, reason: message };
  }
}
