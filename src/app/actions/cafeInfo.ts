"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export type CafePublicInfo = {
  cafe: {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
    hours_text: string | null;
    image_code: string | null;
    is_active: boolean;
  };
  reviewsStats: { avg_rating: number; reviews_count: number } | null;
  promos: Array<{ promo_id: string; title: string; description: string | null; image_code: string | null }>;
};

export async function getCafePublicInfo(cafeId: string): Promise<CafePublicInfo | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = supabaseAdmin();

  const { data: cafe, error: cafeErr } = await supabase
    .from("cafes")
    .select("id, name, city, address, hours_text, image_code, is_active")
    .eq("id", cafeId)
    .single();

  if (cafeErr || !cafe) return null;

  let reviewsStats: { avg_rating: number; reviews_count: number } | null = null;
  try {
    const { data: stats } = await supabase
      .from("v_cafe_reviews_stats")
      .select("avg_rating, reviews_count")
      .eq("cafe_id", cafeId)
      .maybeSingle();
    if (stats && typeof (stats as any).avg_rating === "number") {
      reviewsStats = {
        avg_rating: Number((stats as any).avg_rating),
        reviews_count: Number((stats as any).reviews_count ?? 0),
      };
    }
  } catch {
    // vista puede no existir aún
  }

  let promos: CafePublicInfo["promos"] = [];
  try {
    const { data: promosData } = await supabase
      .from("v_cafe_promos_active")
      .select("promo_id, title, description, image_code")
      .eq("cafe_id", cafeId);
    promos = (promosData ?? []) as CafePublicInfo["promos"];
  } catch {
    // vista puede no existir
  }

  return {
    cafe: cafe as CafePublicInfo["cafe"],
    reviewsStats,
    promos,
  };
}

export async function upsertCafeReview(input: {
  cafe_id: string;
  rating: number;
  comment?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado" };

  const rating = Math.round(Number(input.rating));
  if (rating < 1 || rating > 5) return { ok: false, error: "El rating debe ser entre 1 y 5" };

  const supabase = supabaseAdmin();
  const profileId = session.profileId;

  const { error } = await supabase.from("cafe_reviews").upsert(
    {
      cafe_id: input.cafe_id,
      profile_id: profileId,
      rating,
      comment: (input.comment ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cafe_id,profile_id" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
