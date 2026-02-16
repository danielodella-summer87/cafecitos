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
    .select("welcome_seen_at, created_at")
    .eq("id", session.profileId)
    .maybeSingle();

  const welcomeSeenAt = profile?.welcome_seen_at ?? null;
  const createdAtRaw = (profile as { created_at?: string } | null)?.created_at ?? null;
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : null;
  const now = Date.now();
  const NEW_USER_WINDOW_MINUTES = 10;
  const isNewUser =
    createdAt ? now - createdAt.getTime() <= NEW_USER_WINDOW_MINUTES * 60 * 1000 : false;

  const shouldShowWelcome =
    session.role === "consumer" && !welcomeSeenAt && isNewUser;

  return (
    <WelcomeGuard shouldShowWelcome={shouldShowWelcome}>
      {children}
    </WelcomeGuard>
  );
}
