"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/roles";

// --------------------
// Schemas
// --------------------
const SettingsSchema = z.object({
  welcome_bonus_points: z.coerce.number().int().min(0).max(1000).default(5),
  max_points_per_hour: z.coerce.number().int().min(0).max(100000).default(0),
  max_points_per_day: z.coerce.number().int().min(0).max(100000).default(0),
  max_points_per_month: z.coerce.number().int().min(0).max(100000).default(0),
  max_redeem_per_day: z.coerce.number().int().min(0).max(100000).default(0),
});

const TierSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(32),
  name: z.string().min(2).max(32),
  min_points: z.coerce.number().int().min(0).max(1000000),
  badge_label: z.string().max(40).optional().nullable(),
  badge_message: z.string().max(120).optional().nullable(),
  dot_color: z.string().max(32).optional().nullable(),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.coerce.boolean().default(true),
});

const RewardSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(60),
  description: z.string().max(160).optional().nullable(),
  cost_points: z.coerce.number().int().min(0).max(100000),
  is_global: z.coerce.boolean().default(true),
  cafe_id: z.string().uuid().optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

const ProfilePinSchema = z.object({
  cedula: z.string().min(6).max(20),
  pin: z.string().min(4).max(4),
});

const ProfileTierSchema = z.object({
  profile_id: z.string().uuid(),
  tier_id: z.string().uuid().nullable(),
});

const ProfileActiveSchema = z.object({
  profile_id: z.string().uuid(),
  is_active: z.coerce.boolean(),
});

const CafeActiveSchema = z.object({
  cafe_id: z.string().uuid(),
  is_active: z.coerce.boolean(),
});

const CafeUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(60),
  is_active: z.coerce.boolean().default(true),
});

// --------------------
// Helpers
// --------------------
async function adminGuard() {
  const session = await getSession();
  requireAdmin(session);
  return session;
}

function ok<T>(data?: T) {
  return { ok: true as const, data };
}
function fail(message: string) {
  return { ok: false as const, error: message };
}

// --------------------
// SETTINGS (singleton)
// --------------------
export async function adminGetSettings() {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("settings_global")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) return fail(error.message);

  const merged = {
    welcome_bonus_points: data?.welcome_bonus_points ?? 5,
    max_points_per_hour: data?.max_points_per_hour ?? 0,
    max_points_per_day: data?.max_points_per_day ?? 0,
    max_points_per_month: data?.max_points_per_month ?? 0,
    max_redeem_per_day: data?.max_redeem_per_day ?? 0,
  };

  return ok(merged);
}

export async function adminUpdateSettings(input: unknown) {
  await adminGuard();
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.message);

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("settings_global")
    .upsert({ id: true, ...parsed.data }, { onConflict: "id" });

  if (error) return fail(error.message);
  return ok(true);
}

// --------------------
// TIERS
// --------------------
export async function adminListTiers() {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("tiers")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("min_points", { ascending: true });

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function adminUpsertTier(input: unknown) {
  await adminGuard();
  const parsed = TierSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.message);

  const p = parsed.data;
  const payload = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    min_points: p.min_points,
    badge_text: [p.badge_label, p.badge_message].filter(Boolean).join(" · ") || "",
    badge_bg: "#000000",
    badge_fg: "#ffffff",
    dot_color: p.dot_color ?? "#22c55e",
    sort_order: p.sort_order,
    is_active: p.is_active,
  };

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("tiers").upsert(payload, { onConflict: "id" });

  if (error) return fail(error.message);
  return ok(true);
}

// --------------------
// REWARDS
// --------------------
export async function adminListRewards() {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("rewards")
    .select("*")
    .order("is_active", { ascending: false })
    .order("cost_points", { ascending: true });

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function adminUpsertReward(input: unknown) {
  await adminGuard();
  const parsed = RewardSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.message);

  const payload = {
    ...parsed.data,
    description: parsed.data.description ?? "",
    cafe_id: parsed.data.is_global ? null : parsed.data.cafe_id ?? null,
  };

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("rewards").upsert(payload, { onConflict: "id" });

  if (error) return fail(error.message);
  return ok(true);
}

// --------------------
// SOCIOS / PROFILES
// --------------------
export async function adminListProfiles() {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, cedula, is_active, cafe_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function adminUpdateProfileActive(input: unknown) {
  await adminGuard();

  const parsed = ProfileActiveSchema.parse(input);
  const supabase = supabaseAdmin();

  const { data: prof, error: e1 } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", parsed.profile_id)
    .maybeSingle();

  if (e1) throw e1;
  if (!prof) return { ok: false as const, error: "Perfil no encontrado" };

  if ((prof as { role?: string }).role === "admin" && parsed.is_active === false) {
    return { ok: false as const, error: "El usuario admin no se puede desactivar." };
  }

  const { error: e2 } = await supabase
    .from("profiles")
    .update({ is_active: parsed.is_active })
    .eq("id", parsed.profile_id);

  if (e2) throw e2;

  return { ok: true as const };
}

export async function adminSetProfileTier(input: unknown) {
  await adminGuard();
  const parsed = ProfileTierSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.message);

  const { profile_id, tier_id } = parsed.data;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("profiles").update({ tier_id }).eq("id", profile_id);

  if (error) return fail(error.message);
  return ok(true);
}

export async function adminResetPinByCedula(input: unknown) {
  await adminGuard();
  const parsed = ProfilePinSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.message);

  const { cedula, pin } = parsed.data;
  const pin_hash = await bcrypt.hash(pin, 10);

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("profiles").update({ pin_hash }).eq("cedula", cedula);

  if (error) return fail(error.message);
  return ok(true);
}

// --------------------
// CAFETERIAS
// --------------------
export async function adminListCafes() {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("cafes")
    .select("id,name,is_active,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return fail(error.message);
  return ok(data ?? []);
}

export async function adminSetCafeActive(input: unknown) {
  await adminGuard();
  const parsed = CafeActiveSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.message);

  const { cafe_id, is_active } = parsed.data;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("cafes").update({ is_active }).eq("id", cafe_id);

  if (error) return fail(error.message);
  return ok(true);
}

export async function adminUpsertCafe(input: unknown) {
  await adminGuard();

  const parsed = CafeUpsertSchema.parse(input);
  const supabase = supabaseAdmin();

  const payload: { name: string; is_active: boolean } = {
    name: parsed.name,
    is_active: parsed.is_active,
  };

  if (parsed.id) {
    const { data, error } = await supabase
      .from("cafes")
      .update(payload)
      .eq("id", parsed.id)
      .select("id")
      .single();

    if (error) throw error;
    return { ok: true as const, data };
  }

  const { data, error } = await supabase
    .from("cafes")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;
  return { ok: true as const, data };
}
