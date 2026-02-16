import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import WelcomeGuard from "./WelcomeGuard";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("welcome_seen_at")
    .eq("id", session.profileId)
    .single();

  const welcomeSeenAt = profile?.welcome_seen_at ?? null;

  return (
    <WelcomeGuard welcomeSeenAt={welcomeSeenAt}>
      {children}
    </WelcomeGuard>
  );
}
