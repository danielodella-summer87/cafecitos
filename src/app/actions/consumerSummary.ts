"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export type ConsumerTx = {
  id: string;
  tx_type: "earn" | "redeem" | "transfer_out" | "transfer_in" | "adjust";
  from_profile_id: string | null;
  to_profile_id: string | null;
  cafe_id: string | null;
  amount: number;
  note: string | null;
  created_at: string;
};

function computeBalance(profileId: string, txs: ConsumerTx[]) {
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

export type ConsumerSummaryResult = {
  session: { profileId: string; fullName: string | null; role: string };
  balance: number;
  last10: ConsumerTx[];
  generatedTotal: number;
  redeemedTotal: number;
  cafesMap: Record<string, string>;
};

export async function getConsumerSummary(): Promise<ConsumerSummaryResult | null> {
  const session = await getSession();
  if (!session || session.role !== "consumer") return null;

  const profileId = session.profileId;
  const supabase = supabaseAdmin();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("id, tx_type, from_profile_id, to_profile_id, cafe_id, amount, note, created_at")
    .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const typed = (txs ?? []) as ConsumerTx[];
  const balance = computeBalance(profileId, typed);

  const generatedTotal = typed
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

  const last10 = typed.slice(0, 10);

  const cafeIds = [...new Set(typed.map((t) => t.cafe_id).filter(Boolean))] as string[];
  const cafesMap: Record<string, string> = {};
  if (cafeIds.length > 0) {
    const { data: cafes } = await supabase
      .from("cafes")
      .select("id, name")
      .in("id", cafeIds);
    if (cafes) {
      for (const c of cafes) {
        cafesMap[c.id] = (c as { name?: string }).name ?? "(sin nombre)";
      }
    }
  }

  return {
    session: {
      profileId: session.profileId,
      fullName: session.fullName ?? null,
      role: session.role,
    },
    balance,
    last10,
    generatedTotal,
    redeemedTotal,
    cafesMap,
  };
}
