"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) throw new Error("No autenticado");
  if (session.role !== "admin") throw new Error("Solo admin");
}

export async function adminGetSettings() {
  const session = await getSession();
  requireAdmin(session);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("settings_global")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (error) throw error;

  return (
    data ?? {
      id: true,
      welcome_bonus_points: 5,
      max_points_per_hour: 50,
      max_points_per_day: 300,
      max_points_per_month: 6000,
      max_redeem_per_day: 50,
    }
  );
}

const settingsSchema = z.object({
  welcome_bonus_points: z.number().int().min(0).max(100),
  max_points_per_hour: z.number().int().min(0).max(1000),
  max_points_per_day: z.number().int().min(0).max(20000),
  max_points_per_month: z.number().int().min(0).max(200000),
  max_redeem_per_day: z.number().int().min(0).max(1000),
});

export async function adminUpdateSettings(input: unknown) {
  const session = await getSession();
  requireAdmin(session);

  const parsed = settingsSchema.parse(input);
  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("settings_global")
    .upsert({ id: true, ...parsed }, { onConflict: "id" });

  if (error) throw error;
  return { ok: true };
}

export async function adminListTiers() {
  const session = await getSession();
  requireAdmin(session);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("tiers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

const tierSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(40),
  name: z.string().min(2).max(40),
  min_points: z.number().int().min(0).max(100000),
  badge_text: z.string().max(120),
  badge_bg: z.string().max(30),
  badge_fg: z.string().max(30),
  dot_color: z.string().max(30),
  sort_order: z.number().int().min(0).max(999),
  is_active: z.boolean(),
});

export async function adminUpsertTier(input: unknown) {
  const session = await getSession();
  requireAdmin(session);

  const parsed = tierSchema.parse(input);
  const supabase = supabaseAdmin();

  const { error } = await supabase.from("tiers").upsert(parsed);
  if (error) throw error;
  return { ok: true };
}

export async function adminListRewards() {
  const session = await getSession();
  requireAdmin(session);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("rewards")
    .select("id,title,description,cost_points,is_global,cafe_id,is_active,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

const rewardSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  cost_points: z.number().int().min(1).max(100000),
  is_global: z.boolean(),
  cafe_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean(),
});

export async function adminUpsertReward(input: unknown) {
  const session = await getSession();
  requireAdmin(session);

  const parsed = rewardSchema.parse(input);
  const supabase = supabaseAdmin();

  const { error } = await supabase.from("rewards").upsert({
    ...parsed,
    description: parsed.description ?? "",
    cafe_id: parsed.is_global ? null : (parsed.cafe_id ?? null),
  });

  if (error) throw error;
  return { ok: true };
}
