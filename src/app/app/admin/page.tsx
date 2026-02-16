import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AdminPanelClient from "./AdminPanelClient";
import {
  adminGetSettings,
  adminListTiers,
  adminListRewards,
  adminListProfiles,
  adminListCafes,
} from "@/app/actions/adminPro";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/login");

  const [settingsRes, tiersRes, rewardsRes, profilesRes, cafesRes] = await Promise.all([
    adminGetSettings(),
    adminListTiers(),
    adminListRewards(),
    adminListProfiles(),
    adminListCafes(),
  ]);

  const serverErrors: string[] = [];
  if (!settingsRes.ok) serverErrors.push(`Error cargando settings: ${settingsRes.error}`);
  if (!tiersRes.ok) serverErrors.push(`Error cargando tiers: ${tiersRes.error}`);
  if (!rewardsRes.ok) serverErrors.push(`Error cargando rewards: ${rewardsRes.error}`);
  if (!profilesRes.ok) serverErrors.push(`Error cargando socios: ${profilesRes.error}`);
  if (!cafesRes.ok) serverErrors.push(`Error cargando cafeterías: ${cafesRes.error}`);

  return (
    <AdminPanelClient
      initialSettings={settingsRes.ok ? settingsRes.settings : null}
      initialTiers={tiersRes.ok ? tiersRes.tiers : []}
      initialRewards={rewardsRes.ok ? rewardsRes.rewards : []}
      initialProfiles={profilesRes.ok ? profilesRes.profiles : []}
      initialCafes={cafesRes.ok ? cafesRes.cafes : []}
      serverErrors={serverErrors}
    />
  );
}
