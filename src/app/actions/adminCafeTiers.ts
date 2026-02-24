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

export type UpsertCafeTierResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function upsertAdminCafeTier(input: {
  id?: string;
  name: string;
  min_total_points: number;
  badge_color?: string | null;
}): Promise<UpsertCafeTierResult> {
  try {
    await adminGuard();
    const supabase = supabaseAdmin();

    const payload: Record<string, unknown> = {
      name: input.name.trim(),
      min_total_points: input.min_total_points,
      badge_color: input.badge_color ?? null,
    };

    if (input.id) payload.id = input.id;

    const { data, error } = await supabase
      .from("cafe_tiers")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .maybeSingle();

    if (error) {
      const code = (error as { code?: string })?.code;
      const msg = (error as { message?: string })?.message ?? "";
      if (code === "23505" || msg.includes("cafe_tiers_name_uq") || msg.includes("duplicate key")) {
        return {
          ok: false,
          error: "Ya existe un nivel de cafetería con ese nombre. Cambiá el nombre y volvé a guardar.",
        };
      }
      return { ok: false, error: msg || "Error al guardar nivel" };
    }

    const id = (data as { id?: string } | null)?.id;
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar nivel";
    return { ok: false, error: msg };
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
