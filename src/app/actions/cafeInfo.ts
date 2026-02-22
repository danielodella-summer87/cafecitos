"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

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
    is_active: boolean;
    lat: number | null;
    lng: number | null;
  };
  reviewsStats: { avg_rating: number; reviews_count: number } | null;
  reviews: CafeReviewItem[];
  promos: Array<{ promo_id: string; title: string; description: string | null; image_code: string | null }>;
};

export async function getCafePublicInfo(cafeId: string): Promise<CafePublicInfo | (CafePublicInfo & { debug?: unknown }) | { cafe: null; reviewsStats: null; reviews: never[]; promos: never[]; debug?: unknown }> {
  const session = await getSession();
  if (!session) {
    return { cafe: null, reviewsStats: null, reviews: [], promos: [], debug: { reason: "No autenticado" } };
  }

  const supabase = supabaseAdmin();

  type CafeRow = { id: string; name: string | null; city: string | null; address: string | null; hours_text: string | null; image_code: string | null; is_active: boolean; lat?: number | null; lng?: number | null };
  let cafe: CafeRow | null = null;
  let supabaseError: { message?: string } | null = null;

  const { data: cafeWithCoords, error: errWithCoords } = await supabase
    .from("cafes")
    .select("id, name, city, address, hours_text, image_code, is_active, lat, lng")
    .eq("id", cafeId)
    .maybeSingle();

  if (errWithCoords) {
    const msg = (errWithCoords as { message?: string })?.message ?? "";
    const missingColumn = /column.*(lat|lng).*does not exist/i.test(msg) || msg.includes("lat") || msg.includes("lng");
    if (missingColumn) {
      const { data: cafeBase, error: errBase } = await supabase
        .from("cafes")
        .select("id, name, city, address, hours_text, image_code, is_active")
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

  const cafePayload: CafePublicInfo["cafe"] = {
    id: cafe.id,
    name: cafe.name ?? "",
    city: cafe.city ?? null,
    address: cafe.address ?? null,
    hours_text: cafe.hours_text ?? null,
    image_code: cafe.image_code ?? null,
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
