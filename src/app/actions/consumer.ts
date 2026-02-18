"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

type Tx = {
  id: string;
  tx_type: "earn" | "redeem" | "transfer_out" | "transfer_in" | "adjust";
  from_profile_id: string | null;
  to_profile_id: string | null;
  amount: number;
  note: string | null;
  created_at: string;
};

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

export async function getConsumerDashboard() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "consumer") return null;

  const profileId = session.profileId;
  if (!profileId) {
    return {
      profile: {
        fullName: session.fullName ?? null,
        profileId: session.profileId ?? null,
      },
      balance: 0,
      earnedTotal: 0,
      redeemedTotal: 0,
      last: [],
    };
  }
  const supabase = supabaseAdmin();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("id, tx_type, from_profile_id, to_profile_id, amount, note, created_at")
    .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const typed = (txs ?? []) as Tx[];
  const balance = computeBalance(profileId, typed);

  const earnedTotal = typed
    .filter(
      (t) =>
        (t.tx_type === "earn" || t.tx_type === "adjust" || t.tx_type === "transfer_in") &&
        t.to_profile_id === profileId
    )
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const redeemedTotal = typed
    .filter(
      (t) =>
        (t.tx_type === "redeem" || t.tx_type === "transfer_out") &&
        t.from_profile_id === profileId
    )
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const last = typed.slice(0, 10);

  return {
    profile: {
      fullName: session.fullName ?? null,
      profileId: session.profileId,
    },
    balance,
    earnedTotal,
    redeemedTotal,
    last,
  };
}
