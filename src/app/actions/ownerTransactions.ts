"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type OwnerTxRow = {
  id: string;
  tx_type: "earn" | "redeem" | "transfer_out" | "transfer_in" | "adjust";
  amount: number;
  created_at: string;
  cafe_id: string;
  employee_profile_id: string | null;
  employee_name: string | null;
  client_profile_id: string | null;
  client_name: string | null;
  client_cedula: string | null;
};

export type GetOwnerCafeTransactionsParams = {
  days?: number;
  type?: "earn" | "redeem" | "all";
  employeeId?: string;
  searchCedula?: string;
  limit?: number;
  offset?: number;
};

export type GetOwnerCafeTransactionsResult = {
  rows: OwnerTxRow[];
  totalCount: number;
  summary30d?: { assigned: number; redeemed: number; net: number };
};

export async function getOwnerCafeTransactions(
  params: GetOwnerCafeTransactionsParams = {}
): Promise<GetOwnerCafeTransactionsResult | null> {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;

  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return null;

  const cafeId = session.cafeId ?? null;
  if (!cafeId) return null;

  const days = Math.min(365, Math.max(1, params.days ?? 30));
  const type = params.type ?? "all";
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const offset = Math.max(0, params.offset ?? 0);

  const supabase = supabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  let profileIdsByCedula: string[] = [];
  if (params.searchCedula && params.searchCedula.trim().length >= 2) {
    const { data: profilesByCedula } = await supabase
      .from("profiles")
      .select("id")
      .ilike("cedula", `%${params.searchCedula.trim().replace(/\D/g, "")}%`);
    profileIdsByCedula = (profilesByCedula ?? []).map((p: { id: string }) => p.id);
  }

  let query = supabase
    .from("point_transactions")
    .select("id, tx_type, amount, created_at, cafe_id, actor_owner_profile_id, from_profile_id, to_profile_id", { count: "exact" })
    .eq("cafe_id", cafeId)
    .in("tx_type", type === "all" ? ["earn", "redeem"] : [type])
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  if (params.employeeId) {
    query = query.eq("actor_owner_profile_id", params.employeeId);
  }

  if (profileIdsByCedula.length > 0) {
    const ids = profileIdsByCedula.join(",");
    query = query.or(`and(tx_type.eq.earn,to_profile_id.in.(${ids})),and(tx_type.eq.redeem,from_profile_id.in.(${ids}))`);
  }

  const { data: txs, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("getOwnerCafeTransactions", error);
    return { rows: [], totalCount: 0 };
  }

  const rows = (txs ?? []) as Array<{
    id: string;
    tx_type: string;
    amount: number;
    created_at: string;
    cafe_id: string;
    actor_owner_profile_id: string | null;
    from_profile_id: string | null;
    to_profile_id: string | null;
  }>;

  const employeeIds = [...new Set(rows.map((t) => t.actor_owner_profile_id).filter(Boolean))] as string[];
  const clientIds = [...new Set(
    rows.flatMap((t) =>
      t.tx_type === "earn" ? (t.to_profile_id ? [t.to_profile_id] : []) : t.tx_type === "redeem" ? (t.from_profile_id ? [t.from_profile_id] : []) : []
    )
  )];

  const allProfileIds = [...new Set([...employeeIds, ...clientIds])];
  let profilesMap: Record<string, { full_name: string | null; cedula: string | null }> = {};
  if (allProfileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, cedula")
      .in("id", allProfileIds);
    if (profiles) {
      for (const p of profiles as Array<{ id: string; full_name: string | null; cedula: string | null }>) {
        profilesMap[p.id] = { full_name: p.full_name ?? null, cedula: p.cedula ?? null };
      }
    }
  }

  let result: OwnerTxRow[] = rows.map((t) => {
    const employeeId = t.actor_owner_profile_id ?? null;
    const clientId = t.tx_type === "earn" ? t.to_profile_id : t.tx_type === "redeem" ? t.from_profile_id : null;
    const emp = employeeId ? profilesMap[employeeId] : null;
    const cli = clientId ? profilesMap[clientId] : null;
    return {
      id: t.id,
      tx_type: t.tx_type as OwnerTxRow["tx_type"],
      amount: Number(t.amount),
      created_at: t.created_at,
      cafe_id: t.cafe_id,
      employee_profile_id: employeeId,
      employee_name: emp?.full_name ?? null,
      client_profile_id: clientId,
      client_name: cli?.full_name ?? null,
      client_cedula: cli?.cedula ?? null,
    };
  });

  const totalCount = count ?? result.length;

  let summary: GetOwnerCafeTransactionsResult["summary30d"];
  if (offset === 0) {
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    const iso30 = last30.toISOString();
    const { data: sumData } = await supabase
      .from("point_transactions")
      .select("tx_type, amount")
      .eq("cafe_id", cafeId)
      .in("tx_type", ["earn", "redeem"])
      .gte("created_at", iso30);
    const list = (sumData ?? []) as Array<{ tx_type: string; amount: number }>;
    const assigned = list.filter((r) => r.tx_type === "earn").reduce((a, r) => a + Number(r.amount), 0);
    const redeemed = list.filter((r) => r.tx_type === "redeem").reduce((a, r) => a + Number(r.amount), 0);
    summary = { assigned, redeemed, net: assigned - redeemed };
  }

  return {
    rows: result,
    totalCount,
    summary30d: summary ?? undefined,
  };
}

export type OwnerEmployeeOption = { id: string; full_name: string | null };

export async function getOwnerCafeEmployeeOptions(): Promise<OwnerEmployeeOption[] | null> {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return null;
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return null;

  const supabase = supabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - 365);
  const { data: txs } = await supabase
    .from("point_transactions")
    .select("actor_owner_profile_id")
    .eq("cafe_id", cafeId)
    .in("tx_type", ["earn", "redeem"])
    .gte("created_at", since.toISOString())
    .not("actor_owner_profile_id", "is", null);

  const ids = [...new Set((txs ?? []).map((t: { actor_owner_profile_id: string }) => t.actor_owner_profile_id))];
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  return (profiles ?? []).map((p: { id: string; full_name: string | null }) => ({ id: p.id, full_name: p.full_name ?? null }));
}
