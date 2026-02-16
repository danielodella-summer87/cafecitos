import WelcomeClient from "./WelcomeClient";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Tx = {
  tx_type: "earn" | "redeem" | "transfer_out" | "transfer_in" | "adjust";
  from_profile_id: string | null;
  to_profile_id: string | null;
  amount: number;
};

function normalizeCedula(input: unknown) {
  return String(input ?? "").trim().replace(/\D/g, "");
}

function computeBalance(profileId: string, txs: Tx[]) {
  let balance = 0;
  for (const t of txs) {
    const toId = t.to_profile_id ?? null;
    const fromId = t.from_profile_id ?? null;

    switch (t.tx_type) {
      case "earn":
      case "adjust":
      case "transfer_in":
        if (toId === profileId) balance += Number(t.amount ?? 0);
        break;
      case "redeem":
      case "transfer_out":
        if (fromId === profileId) balance -= Number(t.amount ?? 0);
        break;
    }
  }
  return balance;
}

export default async function RegisterWelcomePage({
  searchParams,
}: {
  searchParams?: { cedula?: string; name?: string };
}) {
  const cedula = normalizeCedula(searchParams?.cedula);
  const name = String(searchParams?.name ?? "").trim().slice(0, 20);

  const supa = supabaseAdmin();

  let tierName = "Starter";
  let tierSlug = "starter";
  let badgeText = "Cliente nuevo";
  let badgeMessage = "Sumá cafecitos en cada visita";
  let dotColor = "#9CA3AF";
  let balance = 0;
  let welcomeBonus = 5;

  if (cedula.length >= 6) {
    const s = await supa
      .from("settings_global")
      .select("welcome_bonus_points")
      .eq("id", true)
      .maybeSingle();

    if (!s.error && s.data?.welcome_bonus_points != null) {
      welcomeBonus = Number(s.data.welcome_bonus_points) || 0;
    }

    const p = await supa
      .from("profiles")
      .select("id, full_name, cedula, tier_id")
      .eq("cedula", cedula)
      .maybeSingle();

    if (!p.error && p.data?.id) {
      const profileId = p.data.id as string;

      if (p.data.tier_id) {
        const t = await supa
          .from("tiers")
          .select("slug, name, badge_label, badge_message, dot_color")
          .eq("id", p.data.tier_id)
          .maybeSingle();

        if (!t.error && t.data) {
          tierSlug = String(t.data.slug ?? "starter");
          tierName = String(t.data.name ?? "Starter");
          dotColor = String(t.data.dot_color ?? "#9CA3AF");
          badgeText = String((t.data as { badge_label?: string }).badge_label ?? "").trim() || tierName;
          badgeMessage = String((t.data as { badge_message?: string }).badge_message ?? "").trim() || "Sumá cafecitos en cada visita";
        }
      }

      const tx = await supa
        .from("point_transactions")
        .select("tx_type, from_profile_id, to_profile_id, amount")
        .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!tx.error && tx.data) {
        balance = computeBalance(profileId, tx.data as Tx[]);
      }
    }
  }

  return (
    <WelcomeClient
      name={name}
      cedula={cedula}
      tierName={tierName}
      tierSlug={tierSlug}
      badgeText={badgeText}
      badgeMessage={badgeMessage}
      dotColor={dotColor}
      balance={balance}
      welcomeBonus={welcomeBonus}
    />
  );
}
