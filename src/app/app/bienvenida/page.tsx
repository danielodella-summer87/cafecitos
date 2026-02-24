export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import BienvenidaClient from "./BienvenidaClient";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "consumer" && session.profileId) {
    const { data: profile } = await supabaseAdmin()
      .from("profiles")
      .select("welcome_seen_at")
      .eq("id", session.profileId)
      .maybeSingle();
    const welcomeSeenAt = profile?.welcome_seen_at ?? null;
    if (welcomeSeenAt) redirect("/app/consumer");
  }

  return <BienvenidaClient />;
}
