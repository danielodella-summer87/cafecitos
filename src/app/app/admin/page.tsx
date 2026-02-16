export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AdminPanelClient from "./AdminPanelClient";
import {
  adminGetSettings,
  adminListTiers,
  adminListRewards,
  adminListProfiles,
  adminListCafes,
  adminRecalcCafeTiers,
  adminGetOwnerCafesWithTiers,
} from "@/app/actions/adminPro";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/login");

  await adminRecalcCafeTiers();

  const [settingsRes, tiersRes, rewardsRes, profilesRes, cafesRes, ownerCafesRes] = await Promise.all([
    adminGetSettings(),
    adminListTiers(),
    adminListRewards(),
    adminListProfiles(),
    adminListCafes(),
    adminGetOwnerCafesWithTiers(),
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

  const ownerCafesMap: Record<string, Array<{ cafe_id: string; cafe_name: string; cafe_tier_name: string | null; badge_color: string | null; total_points: number }>> = {};
  if (ownerCafesRes.ok && ownerCafesRes.data) {
    for (const { profile_id, cafes } of ownerCafesRes.data) {
      ownerCafesMap[profile_id] = cafes;
    }
  }

  return (
    <AdminPanelClient
      initialSettings={settingsRes.ok ? settingsRes.settings : null}
      initialTiers={tiersRes.ok ? tiersRes.tiers : []}
      initialRewards={rewardsRes.ok ? rewardsRes.rewards : []}
      initialProfiles={profilesRes.ok ? profilesRes.profiles : []}
      initialCafes={
        cafesRes.ok
          ? (cafesRes.cafes ?? [])
              .filter((c: any) => c?.id)
              .map((c: any) => ({
                id: String(c.id),
                name: c.name,
                is_active: c.is_active,
              }))
          : []
      }
      initialOwnerCafes={ownerCafesMap}
      serverErrors={serverErrors}
    />
  );
}
