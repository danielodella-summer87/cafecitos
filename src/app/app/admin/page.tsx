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

  const [settings, tiers, rewards, profiles, cafes] = await Promise.all([
    adminGetSettings(),
    adminListTiers(),
    adminListRewards(),
    adminListProfiles(),
    adminListCafes(),
  ]);

  return (
    <AdminPanelClient
      initialSettings={settings.ok ? settings.data : null}
      initialTiers={tiers.ok ? tiers.data : []}
      initialRewards={rewards.ok ? rewards.data : []}
      initialProfiles={profiles.ok ? profiles.data : []}
      initialCafes={cafes.ok ? cafes.data : []}
      serverErrors={{
        settings: settings.ok ? null : settings.error,
        tiers: tiers.ok ? null : tiers.error,
        rewards: rewards.ok ? null : rewards.error,
        profiles: profiles.ok ? null : profiles.error,
        cafes: cafes.ok ? null : cafes.error,
      }}
    />
  );
}
