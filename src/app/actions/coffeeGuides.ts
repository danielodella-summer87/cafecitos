"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getBalanceForProfile } from "@/app/actions/consumerSummary";
import { TIER_ORDER } from "@/lib/tierAccess";

export type CoffeeGuide = {
  id: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  category: string;
  min_tier_slug: string;
  reading_minutes: number;
  content_json: Record<string, unknown>;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string | null;
};

export type CoffeeGuideView = {
  profile_id: string;
  guide_id: string;
  progress_pct: number;
  completed_at: string | null;
  updated_at: string | null;
};

export async function getCoffeeGuides(): Promise<
  { ok: true; guides: CoffeeGuide[] } | { ok: false; error: string }
> {
  const supabase = supabaseAdmin();
  const res = await supabase
    .from("coffee_guides")
    .select("id, title, excerpt, cover_url, category, min_tier_slug, reading_minutes, content_json, is_active, sort_order, created_at")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (res.error) return { ok: false, error: res.error.message };
  const guides = (res.data ?? []) as CoffeeGuide[];
  return { ok: true, guides };
}

export async function getCoffeeGuideById(
  id: string
): Promise<{ ok: true; guide: CoffeeGuide } | { ok: false; error: string }> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("coffee_guides")
    .select("id, title, excerpt, cover_url, category, min_tier_slug, reading_minutes, content_json, is_active, sort_order, created_at")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Guía no encontrada" };
  return { ok: true, guide: data as CoffeeGuide };
}

export async function getCurrentUserTierSlug(profileId: string): Promise<string> {
  const supabase = supabaseAdmin();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile?.tier_id) return "starter";
  const { data: tier } = await supabase
    .from("tiers")
    .select("slug")
    .eq("id", profile.tier_id)
    .maybeSingle();
  return tier?.slug ?? "starter";
}

export type UniversoPageData = {
  tierSlug: string;
  balance: number;
  nextTierName: string | null;
  missingPoints: number;
  guides: CoffeeGuide[];
  viewsMap: Record<string, CoffeeGuideView>;
};

export async function getUniversoPageData(profileId: string): Promise<UniversoPageData | null> {
  const [guidesRes, tierSlug, views, balance] = await Promise.all([
    getCoffeeGuides(),
    getCurrentUserTierSlug(profileId),
    getCoffeeGuideViews(profileId),
    getBalanceForProfile(profileId),
  ]);

  if (!guidesRes.ok) return null;
  const guides = guidesRes.guides;

  const viewsMap: Record<string, CoffeeGuideView> = {};
  for (const v of views) viewsMap[v.guide_id] = v;

  const supabase = supabaseAdmin();
  const { data: tiersRows } = await supabase
    .from("tiers")
    .select("slug, name, min_points")
    .in("slug", [...TIER_ORDER])
    .order("min_points", { ascending: true });

  const tiersBySlug = new Map<string | null, { name: string; min_points: number }>();
  for (const t of tiersRows ?? []) {
    tiersBySlug.set((t as { slug: string }).slug, {
      name: (t as { name: string }).name,
      min_points: (t as { min_points: number }).min_points ?? 0,
    });
  }

  const currentIdx = TIER_ORDER.indexOf(tierSlug as (typeof TIER_ORDER)[number]);
  const nextSlug = currentIdx >= 0 && currentIdx < TIER_ORDER.length - 1 ? TIER_ORDER[currentIdx + 1] : null;
  const nextTier = nextSlug ? tiersBySlug.get(nextSlug) : null;
  const minForNext = nextTier?.min_points ?? 0;
  const missingPoints = Math.max(0, minForNext - balance);

  return {
    tierSlug,
    balance,
    nextTierName: nextTier?.name ?? null,
    missingPoints,
    guides,
    viewsMap,
  };
}

export async function getCoffeeGuideViews(profileId: string): Promise<CoffeeGuideView[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("coffee_guide_views")
    .select("profile_id, guide_id, progress_pct, completed_at, updated_at")
    .eq("profile_id", profileId);
  return (data ?? []) as CoffeeGuideView[];
}

export async function upsertGuideView(
  profileId: string,
  guideId: string,
  payload: { progress_pct: number; completed_at?: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("coffee_guide_views").upsert(
    {
      profile_id: profileId,
      guide_id: guideId,
      progress_pct: payload.progress_pct,
      completed_at: payload.completed_at ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,guide_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
