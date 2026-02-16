"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

/* ============================================================
ADMIN GUARD
============================================================ */
async function adminGuard() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.role !== "admin") throw new Error("Solo admin");
  return session;
}

/* ============================================================
SETTINGS
============================================================ */
const SettingsSchema = z.object({
  welcome_bonus_points: z.coerce.number().int().min(0).default(5),
  max_points_per_hour: z.coerce.number().int().min(0).default(0),
  max_points_per_day: z.coerce.number().int().min(0).default(0),
  max_points_per_month: z.coerce.number().int().min(0).default(0),
  max_redeem_per_day: z.coerce.number().int().min(0).default(0),
  cross_cafe_redeem: z.coerce.boolean().default(true),
  show_membership_badge: z.coerce.boolean().default(true),
});

export type AdminSettings = z.infer<typeof SettingsSchema>;

const DEFAULT_SETTINGS: AdminSettings = {
  welcome_bonus_points: 5,
  max_points_per_hour: 0,
  max_points_per_day: 0,
  max_points_per_month: 0,
  max_redeem_per_day: 0,
  cross_cafe_redeem: true,
  show_membership_badge: true,
};

export async function adminGetSettings() {
  await adminGuard();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("settings_global")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (error) return { ok: true as const, settings: DEFAULT_SETTINGS };

  if (!data) {
    await supabase.from("settings_global").insert({ id: true });
    return { ok: true as const, settings: DEFAULT_SETTINGS };
  }

  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS, ...data };
  if ("allow_cross_cafe_redeem" in data) merged.cross_cafe_redeem = data.allow_cross_cafe_redeem;
  const parsed = SettingsSchema.safeParse(merged);
  if (!parsed.success) return { ok: true as const, settings: DEFAULT_SETTINGS };

  return { ok: true as const, settings: parsed.data };
}

export async function adminUpdateSettings(input: unknown) {
  await adminGuard();
  const supabase = supabaseAdmin();

  const parsed = SettingsSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Settings inválidos" };

  const row = {
    id: true,
    welcome_bonus_points: parsed.data.welcome_bonus_points,
    max_points_per_hour: parsed.data.max_points_per_hour,
    max_points_per_day: parsed.data.max_points_per_day,
    max_points_per_month: parsed.data.max_points_per_month,
    max_redeem_per_day: parsed.data.max_redeem_per_day,
    allow_cross_cafe_redeem: parsed.data.cross_cafe_redeem,
    show_membership_badge: parsed.data.show_membership_badge,
  };
  const { error } = await supabase.from("settings_global").upsert(row);
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const };
}

/* ============================================================
TIERS (NIVELES)
============================================================ */
const TierSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2),
  name: z.string().min(2),
  min_points: z.coerce.number().int().min(0).default(0),
  badge_label: z.string().optional().nullable(),
  badge_message: z.string().optional().nullable(),
  dot_color: z.string().optional().nullable(),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_active: z.coerce.boolean().default(true),
});

export type AdminTier = z.infer<typeof TierSchema>;

export async function adminListTiers() {
  await adminGuard();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, tiers: (data ?? []) as AdminTier[] };
}

export async function adminUpsertTier(input: unknown) {
  await adminGuard();
  const supabase = supabaseAdmin();

  const parsed = TierSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Nivel inválido" };

  const { error } = await supabase.from("tiers").upsert(parsed.data);
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const };
}

/* ============================================================
REWARDS (BENEFICIOS)
============================================================ */
const RewardSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  cost_points: z.coerce.number().int().min(0).default(0),
  is_global: z.coerce.boolean().default(true),
  cafe_id: z.string().uuid().optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export type AdminReward = z.infer<typeof RewardSchema>;

export async function adminListRewards() {
  await adminGuard();
  const supabase = supabaseAdmin();

  let lastError: string | null = null;

  const res1 = await supabase.from("rewards").select("*").order("created_at", { ascending: false });
  if (!res1.error) {
    return { ok: true as const, rewards: (res1.data ?? []) as AdminReward[] };
  }
  lastError = res1.error.message;

  const res2 = await supabase.from("rewards").select("*").order("updated_at", { ascending: false });
  if (!res2.error) {
    return { ok: true as const, rewards: (res2.data ?? []) as AdminReward[] };
  }

  const res3 = await supabase.from("rewards").select("*");
  if (!res3.error) {
    return { ok: true as const, rewards: (res3.data ?? []) as AdminReward[] };
  }

  return { ok: false as const, error: lastError ?? res3.error.message };
}

export async function adminUpsertReward(input: unknown) {
  await adminGuard();
  const supabase = supabaseAdmin();

  const parsed = RewardSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Beneficio inválido" };

  const { error } = await supabase.from("rewards").upsert(parsed.data);
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const };
}

/* ============================================================
CAFES (CAFETERÍAS)
============================================================ */
const CafeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  is_active: z.coerce.boolean().default(true),
});

export type AdminCafe = z.infer<typeof CafeSchema>;

export async function adminListCafes() {
  await adminGuard();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("cafes")
    .select("id,name,is_active,created_at")
    .order("created_at", { ascending: false });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, cafes: (data ?? []) as AdminCafe[] };
}

export async function adminUpsertCafe(input: unknown) {
  await adminGuard();
  const supabase = supabaseAdmin();

  const parsed = CafeSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Cafetería inválida" };

  const { error } = await supabase.from("cafes").upsert(parsed.data);
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const };
}

export async function adminUpdateCafeActive(input: { cafe_id: string; is_active: boolean }) {
  await adminGuard();
  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("cafes")
    .update({ is_active: !!input.is_active })
    .eq("id", input.cafe_id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/* ============================================================
PROFILES (SOCIOS)
============================================================ */
const ProfileActiveSchema = z.object({
  profile_id: z.string().uuid(),
  is_active: z.coerce.boolean(),
});

const ProfileTierSchema = z.object({
  profile_id: z.string().uuid(),
  tier_id: z.string().uuid().nullable(),
});

export async function adminListProfiles() {
  await adminGuard();
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,cedula,role,is_active,tier_id,created_at,cafe_id")
    .order("created_at", { ascending: false });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, profiles: data ?? [] };
}

export async function adminUpdateProfileActive(input: unknown) {
  await adminGuard();
  const supabase = supabaseAdmin();

  const parsed = ProfileActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Input inválido" };

  const { data: target, error: tErr } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", parsed.data.profile_id)
    .single();

  if (tErr) return { ok: false as const, error: tErr.message };
  if (target?.role === "admin" && parsed.data.is_active === false) {
    return { ok: false as const, error: "No se puede desactivar un admin" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: parsed.data.is_active })
    .eq("id", parsed.data.profile_id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function adminUpdateProfileTier(input: unknown) {
  await adminGuard();
  const supabase = supabaseAdmin();

  const parsed = ProfileTierSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Input inválido" };

  const { error } = await supabase
    .from("profiles")
    .update({ tier_id: parsed.data.tier_id })
    .eq("id", parsed.data.profile_id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
