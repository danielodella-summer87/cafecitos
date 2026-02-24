"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

const TABLE_MISSING_MSG =
  "Falta la tabla promotions en Supabase. Corré la migration: supabase db push";

function isTableNotFoundError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /Could not find the table 'public\.promotions'|relation "public\.promotions" does not exist/i.test(msg);
}

async function adminGuard() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (session.role !== "admin") throw new Error("Solo admin");
}

const scopeEnum = z.enum(["global", "specific"]);

const createSchema = z
  .object({
    title: z.string().min(2, "Título al menos 2 caracteres"),
    subtitle: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    scope: scopeEnum.default("specific"),
    cafe_ids: z.array(z.string().uuid()).default([]),
    start_at: z.string().optional().nullable().or(z.literal("")),
    end_at: z.string().optional().nullable().or(z.literal("")),
  })
  .refine(
    (d) => {
      if (d.scope === "specific") return d.cafe_ids.length >= 1;
      return true;
    },
    { message: "Si el alcance es específico, elegí al menos una cafetería.", path: ["cafe_ids"] }
  )
  .refine(
    (d) => {
      const s = d.start_at && String(d.start_at).trim();
      const e = d.end_at && String(d.end_at).trim();
      if (!s || !e) return true;
      const start = new Date(s).getTime();
      const end = new Date(e).getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) return true;
      return end >= start;
    },
    { message: "end_at debe ser >= start_at", path: ["end_at"] }
  );

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

export type PromotionRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  scope: string;
  start_at: string | null;
  end_at: string | null;
  created_at: string | null;
  cafe_ids: string[];
  cafe_names: string[];
};

export async function getPromotionsForAdmin(): Promise<PromotionRow[]> {
  await adminGuard();
  const sb = supabaseAdmin();

  const { data: promos, error: e1 } = await sb
    .from("promotions")
    .select("id, title, subtitle, description, image_url, is_active, scope, starts_at, ends_at, created_at")
    .order("created_at", { ascending: false });

  if (e1) return [];
  const list = (promos ?? []) as Array<{
    id: string;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    image_url?: string | null;
    is_active?: boolean;
    scope?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    created_at?: string | null;
  }>;

  const result: PromotionRow[] = [];
  for (const p of list) {
    const { data: links } = await sb
      .from("promotion_cafes")
      .select("cafe_id")
      .eq("promotion_id", p.id);
    const cafeIds = (links ?? []).map((r: { cafe_id: string }) => r.cafe_id);
    let cafeNames: string[] = [];
    if (cafeIds.length > 0) {
      const { data: cafes } = await sb.from("cafes").select("id, name").in("id", cafeIds);
      cafeNames = (cafes ?? []).map((c: { id: string; name?: string }) => (c.name ?? "").trim() || "(sin nombre)");
    }
    result.push({
      id: p.id,
      title: p.title ?? "",
      subtitle: p.subtitle ?? null,
      description: p.description ?? null,
      image_url: p.image_url ?? null,
      is_active: p.is_active ?? true,
      scope: p.scope ?? "specific",
      start_at: p.starts_at ?? null,
      end_at: p.ends_at ?? null,
      created_at: p.created_at ?? null,
      cafe_ids: cafeIds,
      cafe_names: cafeNames,
    });
  }
  return result;
}

export type CreatePromotionInput = z.infer<typeof createSchema>;
export type UpdatePromotionInput = z.infer<typeof updateSchema>;

export async function createPromotion(
  input: CreatePromotionInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await adminGuard();
    const parsed = createSchema.safeParse({
      ...input,
      start_at: input.start_at && String(input.start_at).trim() ? input.start_at : null,
      end_at: input.end_at && String(input.end_at).trim() ? input.end_at : null,
    });
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors?.[0] ?? parsed.error.message;
      return { ok: false, error: typeof msg === "string" ? msg : "Datos inválidos" };
    }

    const sb = supabaseAdmin();
    const { data: row, error: ins } = await sb
      .from("promotions")
      .insert({
        title: parsed.data.title.trim(),
        subtitle: parsed.data.subtitle?.trim() || null,
        description: parsed.data.description?.trim() || null,
        image_url: parsed.data.image_url?.trim() || null,
        scope: parsed.data.scope,
        is_active: true,
        starts_at: parsed.data.start_at && String(parsed.data.start_at).trim() ? parsed.data.start_at : null,
        ends_at: parsed.data.end_at && String(parsed.data.end_at).trim() ? parsed.data.end_at : null,
      })
      .select("id")
      .single();

    if (ins || !row?.id) {
      if (ins && isTableNotFoundError(ins.message)) return { ok: false, error: TABLE_MISSING_MSG };
      return { ok: false, error: ins?.message ?? "Error al crear" };
    }

    if (parsed.data.scope === "specific" && parsed.data.cafe_ids.length > 0) {
      const rows = parsed.data.cafe_ids.map((cafe_id) => ({
        promotion_id: row.id,
        cafe_id,
      }));
      const { error: linkErr } = await sb.from("promotion_cafes").insert(rows);
      if (linkErr) {
        if (isTableNotFoundError(linkErr.message)) return { ok: false, error: TABLE_MISSING_MSG };
        return { ok: false, error: linkErr.message };
      }
    }

    return { ok: true, id: row.id };
  } catch (e) {
    if (isTableNotFoundError(e)) return { ok: false, error: TABLE_MISSING_MSG };
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear promoción" };
  }
}

export async function updatePromotion(
  id: string,
  input: Omit<UpdatePromotionInput, "id">
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminGuard();
    const parsed = updateSchema.safeParse({
      ...input,
      id,
      start_at: input.start_at && String(input.start_at).trim() ? input.start_at : null,
      end_at: input.end_at && String(input.end_at).trim() ? input.end_at : null,
    });
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors?.[0] ?? parsed.error.message;
      return { ok: false, error: typeof msg === "string" ? msg : "Datos inválidos" };
    }

    const sb = supabaseAdmin();
    const { error: upErr } = await sb
      .from("promotions")
      .update({
        title: parsed.data.title.trim(),
        subtitle: parsed.data.subtitle?.trim() || null,
        description: parsed.data.description?.trim() || null,
        image_url: parsed.data.image_url?.trim() || null,
        scope: parsed.data.scope,
        starts_at: parsed.data.start_at && String(parsed.data.start_at).trim() ? parsed.data.start_at : null,
        ends_at: parsed.data.end_at && String(parsed.data.end_at).trim() ? parsed.data.end_at : null,
      })
      .eq("id", id);

    if (upErr) {
      if (isTableNotFoundError(upErr.message)) return { ok: false, error: TABLE_MISSING_MSG };
      return { ok: false, error: upErr.message };
    }

    await sb.from("promotion_cafes").delete().eq("promotion_id", id);

    if (parsed.data.scope === "specific" && parsed.data.cafe_ids.length > 0) {
      const rows = parsed.data.cafe_ids.map((cafe_id) => ({ promotion_id: id, cafe_id }));
      const { error: linkErr } = await sb.from("promotion_cafes").insert(rows);
      if (linkErr) {
        if (isTableNotFoundError(linkErr.message)) return { ok: false, error: TABLE_MISSING_MSG };
        return { ok: false, error: linkErr.message };
      }
    }

    return { ok: true };
  } catch (e) {
    if (isTableNotFoundError(e)) return { ok: false, error: TABLE_MISSING_MSG };
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar" };
  }
}

export async function deletePromotion(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminGuard();
    const sb = supabaseAdmin();
    const { error } = await sb.from("promotions").delete().eq("id", id);
    if (error) {
      if (isTableNotFoundError(error.message)) return { ok: false, error: TABLE_MISSING_MSG };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    if (isTableNotFoundError(e)) return { ok: false, error: TABLE_MISSING_MSG };
    return { ok: false, error: e instanceof Error ? e.message : "Error al eliminar" };
  }
}

export async function togglePromotionActive(
  id: string,
  is_active: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminGuard();
    const sb = supabaseAdmin();
    const { error } = await sb.from("promotions").update({ is_active }).eq("id", id);
    if (error) {
      if (isTableNotFoundError(error.message)) return { ok: false, error: TABLE_MISSING_MSG };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    if (isTableNotFoundError(e)) return { ok: false, error: TABLE_MISSING_MSG };
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar" };
  }
}
