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

  const errMsg = (r: unknown) => {
    if (r && typeof r === "object" && "error" in r) {
      return String((r as any).error);
    }
    return "desconocido";
  };

  if (!settingsRes.ok) serverErrors.push(`Error cargando settings: ${errMsg(settingsRes)}`);
  if (!tiersRes.ok) serverErrors.push(`Error cargando tiers: ${errMsg(tiersRes)}`);
  if (!rewardsRes.ok) serverErrors.push(`Error cargando rewards: ${errMsg(rewardsRes)}`);
  if (!profilesRes.ok) serverErrors.push(`Error cargando socios: ${errMsg(profilesRes)}`);
  if (!cafesRes.ok) serverErrors.push(`Error cargando cafeterías: ${errMsg(cafesRes)}`);

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
