"use server";

import { resolvePromoImage } from "@/lib/resolvePromoImage";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { getCurrentUserTierSlug } from "@/app/actions/coffeeGuides";

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

export type CafeMapItem = { name: string; image_code?: string | null };

export type ConsumerSummaryResult = {
  session: { profileId: string; fullName: string | null; role: string };
  tierSlug: string;
  balance: number;
  last10: ConsumerTx[];
  generatedTotal: number;
  redeemedTotal: number;
  cafesMap: Record<string, CafeMapItem>;
  welcomeGiftRedeemed: boolean;
};

export async function getConsumerSummary(): Promise<ConsumerSummaryResult | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "consumer" && session.role !== "staff") return null;

  const safeProfileId = (session.profileId ?? "").toString();

  if (!safeProfileId) {
    return {
      session: {
        profileId: safeProfileId,
        fullName: session.fullName ?? null,
        role: session.role,
      },
      tierSlug: "starter",
      balance: 0,
      last10: [],
      generatedTotal: 0,
      redeemedTotal: 0,
      cafesMap: {},
      welcomeGiftRedeemed: false,
    };
  }

  const supabase = supabaseAdmin();

  const { data: txs, error } = await supabase
    .from("point_transactions")
    .select("id, tx_type, from_profile_id, to_profile_id, cafe_id, amount, note, created_at")
    .or(`from_profile_id.eq.${safeProfileId},to_profile_id.eq.${safeProfileId}`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const typed = (txs ?? []) as ConsumerTx[];
  const balance = computeBalance(safeProfileId, typed);
  const tierSlug = await getCurrentUserTierSlug(safeProfileId);

  const generatedTotal = typed
    .filter(
      (t) =>
        (t.tx_type === "earn" || t.tx_type === "adjust" || t.tx_type === "transfer_in") &&
        t.to_profile_id === safeProfileId
    )
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const redeemedTotal = typed
    .filter(
      (t) =>
        (t.tx_type === "redeem" || t.tx_type === "transfer_out") &&
        t.from_profile_id === safeProfileId
    )
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const last10 = typed.slice(0, 10);

  const cafeIds = [...new Set(typed.map((t) => t.cafe_id).filter(Boolean))] as string[];
  const cafesMap: Record<string, CafeMapItem> = {};
  if (cafeIds.length > 0) {
    const { data: cafes } = await supabase
      .from("cafes")
      .select("id, name, image_code")
      .in("id", cafeIds);
    if (cafes) {
      for (const c of cafes) {
        const row = c as { id: string; name?: string; image_code?: string | null };
        cafesMap[row.id] = {
          name: row.name ?? "(sin nombre)",
          image_code: row.image_code ?? null,
        };
      }
    }
  }

  const { data: welcomeRow } = await supabase
    .from("welcome_gifts")
    .select("redeemed_at")
    .eq("profile_id", safeProfileId)
    .maybeSingle();
  const welcomeGiftRedeemed = !!welcomeRow?.redeemed_at;

  return {
    session: {
      profileId: safeProfileId,
      fullName: session.fullName ?? null,
      role: session.role,
    },
    tierSlug,
    balance,
    last10,
    generatedTotal,
    redeemedTotal,
    cafesMap,
    welcomeGiftRedeemed,
  };
}

/** Canjear regalo de bienvenida con código DDMM. Solo consumer; valida sesión y llama RPC. */
export async function redeemWelcomeGift(code: string): Promise<{ ok: boolean; message: string; credited?: number }> {
  const session = await getSession();
  if (!session || !session.profileId) return { ok: false, message: "Sesión inválida" };
  if (session.role !== "consumer" && session.role !== "staff") return { ok: false, message: "Sesión inválida" };
  const trimmed = String(code ?? "").trim().replace(/\D/g, "");
  if (trimmed.length !== 4) {
    return { ok: false, message: "El código debe tener 4 dígitos" };
  }
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.rpc("redeem_welcome_gift", {
    p_profile_id: session.profileId,
    p_code: trimmed,
  });
  if (error) {
    return { ok: false, message: error.message ?? "Error al activar el regalo" };
  }
  const result = data as { ok?: boolean; message?: string; credited?: number } | null;
  if (result?.ok) {
    return { ok: true, message: result.message ?? "Regalo activado", credited: result.credited };
  }
  return { ok: false, message: result?.message ?? "No se pudo activar el regalo" };
}

/** Promos para consumer: desde promotions + promotion_cafes + cafes. scope=global => todas las cafeterías activas; scope=specific => solo asignadas. */
export type ConsumerPromoItem = {
  id: string;
  image: string;
  title: string;
  description: string;
  cafes: string[];
};

export async function getConsumerPromos(): Promise<ConsumerPromoItem[]> {
  const session = await getSession();
  if (!session || (session.role !== "consumer" && session.role !== "staff")) return [];

  const supabase = supabaseAdmin();

  const { data: promos, error: ePromos } = await supabase
    .from("promotions")
    .select("id, title, description, image_path, image_url, scope, starts_at, ends_at")
    .eq("is_active", true);
  if (ePromos || !promos?.length) return [];

  const now = new Date().toISOString();
  const activePromos = (
    promos as Array<{
      id: string;
      title?: string;
      description?: string | null;
      image_path?: string | null;
      image_url?: string | null;
      scope?: string;
      starts_at?: string | null;
      ends_at?: string | null;
    }>
  ).filter((p) => {
    if (p.starts_at && p.starts_at > now) return false;
    if (p.ends_at && p.ends_at < now) return false;
    return true;
  });

  const { data: activeCafes } = await supabase
    .from("cafes")
    .select("id, name")
    .eq("is_active", true);
  const allCafeNames: Record<string, string> = {};
  for (const c of activeCafes ?? []) {
    const row = c as { id: string; name?: string };
    allCafeNames[row.id] = (row.name ?? "").trim() || "(sin nombre)";
  }
  const globalCafeNames = Object.values(allCafeNames).filter((n) => n !== "(sin nombre)");

  const result: ConsumerPromoItem[] = [];

  for (const p of activePromos) {
    let cafes: string[] = [];
    if (p.scope === "global") {
      cafes = [...globalCafeNames];
    } else {
      const { data: links } = await supabase
        .from("promotion_cafes")
        .select("cafe_id")
        .eq("promotion_id", p.id);
      const ids = (links ?? []).map((r: { cafe_id: string }) => r.cafe_id);
      cafes = ids.map((cid) => allCafeNames[cid]).filter(Boolean);
    }
    result.push({
      id: p.id,
      image: resolvePromoImage(p),
      title: (p.title ?? "").trim() || "Promo",
      description: (p.description ?? "").trim() || "",
      cafes,
    });
  }
  return result;
}

/** Balance de cafecitos para un perfil (p. ej. Universo Café). */
export async function getBalanceForProfile(profileId: string): Promise<number> {
  const supabase = supabaseAdmin();
  const { data: txs } = await supabase
    .from("point_transactions")
    .select("tx_type, from_profile_id, to_profile_id, amount")
    .or(`from_profile_id.eq.${profileId},to_profile_id.eq.${profileId}`)
    .order("created_at", { ascending: false })
    .limit(500);
  const typed = (txs ?? []) as ConsumerTx[];
  return computeBalance(profileId, typed);
}
