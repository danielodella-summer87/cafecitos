"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

export type CafeTierRow = {
  id: string;
  name: string;
  min_total_points: number;
  badge_color: string | null;
  created_at: string | null;
  updated_at: string | null;
};

async function adminGuard() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.role !== "admin") throw new Error("Solo admin");
}

export async function getAdminCafeTiers(): Promise<CafeTierRow[]> {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("cafe_tiers")
    .select("id,name,min_total_points,badge_color,created_at,updated_at")
    .order("min_total_points", { ascending: true });

  if (error) {
    console.error("getAdminCafeTiers", error);
    return [];
  }
  return (data ?? []) as CafeTierRow[];
}

export async function upsertAdminCafeTier(input: {
  id?: string;
  name: string;
  min_total_points: number;
  badge_color?: string | null;
}) {
  await adminGuard();
  const supabase = supabaseAdmin();

  const payload: Record<string, unknown> = {
    name: input.name,
    min_total_points: input.min_total_points,
    badge_color: input.badge_color ?? null,
  };

  if (input.id) payload.id = input.id;

  const { error } = await supabase
    .from("cafe_tiers")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("upsertAdminCafeTier", error);
    throw new Error(error.message);
  }
}

export async function deleteAdminCafeTier(id: string) {
  await adminGuard();
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("cafe_tiers").delete().eq("id", id);
  if (error) {
    console.error("deleteAdminCafeTier", error);
    throw new Error(error.message);
  }
}
