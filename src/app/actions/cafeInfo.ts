"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const SHOW_MEDIA_DEBUG =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_MEDIA_DEBUG === "1";

export type CafeReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type CafePublicInfo = {
  cafe: {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
    hours_text: string | null;
    image_code: string | null;
    image_path: string | null;
    is_active: boolean;
    lat: number | null;
    lng: number | null;
  };
  reviewsStats: { avg_rating: number; reviews_count: number } | null;
  reviews: CafeReviewItem[];
  promos: Array<{
    promo_id: string;
    title: string;
    description: string | null;
    image_path: string | null;
    image_url: string | null;
  }>;
};

export async function getCafePublicInfo(cafeId: string): Promise<CafePublicInfo | (CafePublicInfo & { debug?: unknown }) | { cafe: null; reviewsStats: null; reviews: never[]; promos: never[]; debug?: unknown }> {
  const session = await getSession();
  if (!session) {
    return { cafe: null, reviewsStats: null, reviews: [], promos: [], debug: { reason: "No autenticado" } };
  }

  const supabase = supabaseAdmin();

  type CafeRow = { id: string; name: string | null; city: string | null; address: string | null; hours_text: string | null; image_code: string | null; image_path: string | null; is_active: boolean; lat?: number | null; lng?: number | null };
  let cafe: CafeRow | null = null;
  let supabaseError: { message?: string } | null = null;

  const { data: cafeWithCoords, error: errWithCoords } = await supabase
    .from("cafes")
    .select("id, name, city, address, hours_text, image_code, image_path, is_active, lat, lng")
    .eq("id", cafeId)
    .maybeSingle();

  if (errWithCoords) {
    const msg = (errWithCoords as { message?: string })?.message ?? "";
    const missingColumn = /column.*(lat|lng).*does not exist/i.test(msg) || msg.includes("lat") || msg.includes("lng");
    if (missingColumn) {
      const { data: cafeBase, error: errBase } = await supabase
        .from("cafes")
        .select("id, name, city, address, hours_text, image_code, image_path, is_active")
        .eq("id", cafeId)
        .maybeSingle();
      if (!errBase && cafeBase) {
        cafe = { ...cafeBase, lat: null, lng: null } as CafeRow;
      } else {
        supabaseError = errBase;
      }
    } else {
      supabaseError = errWithCoords;
    }
  } else if (cafeWithCoords) {
    cafe = cafeWithCoords as CafeRow;
  }

  const debug =
    process.env.NODE_ENV === "development"
      ? {
          cafeId,
          supabaseError: supabaseError
            ? { message: (supabaseError as any).message, code: (supabaseError as any).code, details: (supabaseError as any).details }
            : null,
          found: !!cafe,
          is_active: cafe?.is_active ?? null,
        }
      : undefined;

  if (supabaseError && !cafe) {
    return {
      cafe: null,
      reviewsStats: null,
      reviews: [],
      promos: [],
      ...(debug !== undefined && { debug }),
    };
  }
  if (!cafe) {
    return {
      cafe: null,
      reviewsStats: null,
      reviews: [],
      promos: [],
      ...(debug !== undefined && { debug }),
    };
  }

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

  let reviews: CafeReviewItem[] = [];
  try {
    const { data: reviewsData } = await supabase
      .from("cafe_reviews")
      .select("id, rating, comment, created_at")
      .eq("cafe_id", cafeId)
      .order("created_at", { ascending: false })
      .limit(20);
    reviews = (reviewsData ?? []) as CafeReviewItem[];
  } catch {
    // tabla puede no existir
  }

  // Promos asignadas a esta cafetería desde promotions + promotion_cafes (NULL-safe en fechas)
  let promos: CafePublicInfo["promos"] = [];
  try {
    const { data: links } = await supabase
      .from("promotion_cafes")
      .select("promotion_id")
      .eq("cafe_id", cafeId);
    const promotionIds = (links ?? []).map((r: { promotion_id: string }) => r.promotion_id);
    if (promotionIds.length > 0) {
      const { data: promosRows } = await supabase
        .from("promotions")
        .select("id, title, description, image_path, image_url, is_active, starts_at, ends_at")
        .in("id", promotionIds);
      const now = new Date().toISOString();
      const active = (promosRows ?? []).filter((p: { is_active?: boolean; starts_at?: string | null; ends_at?: string | null }) => {
        if (!p.is_active) return false;
        if (p.starts_at && p.starts_at > now) return false;
        if (p.ends_at && p.ends_at < now) return false;
        return true;
      });
      promos = active.map((p: { id: string; title?: string; description?: string | null; image_path?: string | null; image_url?: string | null }) => ({
        promo_id: p.id,
        title: (p.title ?? "").trim() || "Promo",
        description: (p.description ?? "").trim() || null,
        image_path: p.image_path ?? null,
        image_url: p.image_url ?? null,
      }));
      if (SHOW_MEDIA_DEBUG) {
        console.log("[MEDIA_DEBUG] getCafePublicInfo promos", { cafeId, promotionIds, count: promos.length, promos: promos.map((x) => ({ id: x.promo_id, title: x.title, image_path: x.image_path, image_url: x.image_url })) });
      }
    }
  } catch (e) {
    if (SHOW_MEDIA_DEBUG) console.log("[MEDIA_DEBUG] getCafePublicInfo promos error", cafeId, e);
  }

  const cafePayload: CafePublicInfo["cafe"] = {
    id: cafe.id,
    name: cafe.name ?? "",
    city: cafe.city ?? null,
    address: cafe.address ?? null,
    hours_text: cafe.hours_text ?? null,
    image_code: cafe.image_code ?? null,
    image_path: cafe.image_path ?? null,
    is_active: cafe.is_active ?? true,
    lat: cafe.lat != null ? Number(cafe.lat) : null,
    lng: cafe.lng != null ? Number(cafe.lng) : null,
  };
  return {
    cafe: cafePayload,
    reviewsStats,
    reviews,
    promos,
    ...(debug !== undefined && { debug }),
  };
}

export async function upsertCafeReview(input: {
  cafe_id: string;
  rating: number;
  comment?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "No autorizado" };
  if (session.role === "admin") return { ok: false, error: "Solo clientes pueden calificar" };

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
