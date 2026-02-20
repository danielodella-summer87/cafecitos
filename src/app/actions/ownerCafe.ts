"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type OwnerCafeRow = {
  id: string;
  name: string;
  image_code: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  description: string | null;
  hours_text: string | null;
};

export async function getOwnerCafe(): Promise<OwnerCafeRow | null> {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return null;
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return null;

  const { data, error } = await supabaseAdmin()
    .from("cafes")
    .select("id, name, image_code, city, address, phone, email, instagram, description, hours_text")
    .eq("id", cafeId)
    .single();

  if (error || !data) return null;
  return data as OwnerCafeRow;
}

export type UpdateCafeOwnerInput = {
  name?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  description?: string;
  hours_text?: string;
};

export async function updateCafeOwner(
  input: UpdateCafeOwnerInput
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "owner") return { ok: false, error: "No autorizado" };
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return { ok: false, error: "Solo el dueño puede editar la ficha" };
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return { ok: false, error: "Cafetería no asociada" };

  const name = (input.name ?? "").trim();
  if (name.length > 0 && name.length < 5) return { ok: false, error: "El nombre debe tener al menos 5 caracteres." };
  const hoursText = (input.hours_text ?? "").trim();
  if (hoursText.length > 120) return { ok: false, error: "El horario no puede superar 120 caracteres." };

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = name || null;
  if (input.city !== undefined) updates.city = (input.city ?? "").trim() || null;
  if (input.address !== undefined) updates.address = (input.address ?? "").trim() || null;
  if (input.phone !== undefined) updates.phone = (input.phone ?? "").trim() || null;
  if (input.email !== undefined) updates.email = (input.email ?? "").trim() || null;
  if (input.instagram !== undefined) updates.instagram = (input.instagram ?? "").trim() || null;
  if (input.description !== undefined) updates.description = (input.description ?? "").trim() || null;
  if (input.hours_text !== undefined) updates.hours_text = hoursText || null;

  if (Object.keys(updates).length === 0) return { ok: true };

  const { error } = await supabaseAdmin()
    .from("cafes")
    .update(updates)
    .eq("id", cafeId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type OwnerStaffRow = {
  id: string;
  cafe_id: string;
  full_name: string | null;
  name: string | null;
  role: string;
  is_owner: boolean;
  can_issue: boolean;
  can_redeem: boolean;
  is_active: boolean;
};

export async function listCafeStaffOwner(): Promise<OwnerStaffRow[]> {
  const session = await getSession();
  if (!session || session.role !== "owner") return [];
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return [];
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return [];

  const { data, error } = await supabaseAdmin()
    .from("cafe_staff")
    .select("id, cafe_id, full_name, name, role, is_owner, can_issue, can_redeem, is_active")
    .eq("cafe_id", cafeId)
    .order("is_owner", { ascending: false });

  if (error) {
    const { data: alt } = await supabaseAdmin()
      .from("cafe_staff")
      .select("id, cafe_id, name, role, is_owner, can_issue, can_redeem")
      .eq("cafe_id", cafeId)
      .order("is_owner", { ascending: false });
    return (alt ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      cafe_id: r.cafe_id,
      full_name: null,
      name: (r.name ?? "") as string,
      role: (r.role ?? "") as string,
      is_owner: !!r.is_owner,
      can_issue: r.can_issue !== false,
      can_redeem: r.can_redeem !== false,
      is_active: true,
    })) as OwnerStaffRow[];
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    cafe_id: r.cafe_id,
    full_name: (r.full_name ?? r.name ?? "") as string | null,
    name: (r.name ?? r.full_name ?? "") as string | null,
    role: (r.role ?? "") as string,
    is_owner: !!r.is_owner,
    can_issue: r.can_issue !== false,
    can_redeem: r.can_redeem !== false,
    is_active: r.is_active !== false,
  })) as OwnerStaffRow[];
}

export async function createCafeStaffOwner(input: {
  full_name: string;
  role: string;
  can_issue?: boolean;
  can_redeem?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "owner") return { ok: false, error: "No autorizado" };
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return { ok: false, error: "Solo el dueño puede gestionar staff" };
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return { ok: false, error: "Cafetería no asociada" };

  const full_name = (input.full_name ?? "").trim();
  const role = (input.role ?? "").trim();
  if (!full_name || !role) return { ok: false, error: "Nombre y rol son obligatorios." };

  const row: Record<string, unknown> = {
    cafe_id: cafeId,
    full_name,
    name: full_name,
    role,
    is_owner: false,
    can_issue: input.can_issue !== false,
    can_redeem: input.can_redeem !== false,
    is_active: true,
  };

  const { error } = await supabaseAdmin().from("cafe_staff").insert(row);

  if (error) {
    const msg = (error as { message?: string }).message ?? "";
    if (msg.includes("full_name")) {
      const { error: e2 } = await supabaseAdmin()
        .from("cafe_staff")
        .insert({ cafe_id: cafeId, name: full_name, role, is_owner: false, can_issue: row.can_issue, can_redeem: row.can_redeem });
      if (e2) return { ok: false, error: e2.message };
      return { ok: true };
    }
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function updateCafeStaffOwner(input: {
  id: string;
  full_name?: string;
  role?: string;
  can_issue?: boolean;
  can_redeem?: boolean;
  is_active?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "owner") return { ok: false, error: "No autorizado" };
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return { ok: false, error: "Solo el dueño puede gestionar staff" };
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return { ok: false, error: "Cafetería no asociada" };

  const staff = await listCafeStaffOwner();
  const row = staff.find((s) => s.id === input.id);
  if (!row || row.cafe_id !== cafeId) return { ok: false, error: "Staff no encontrado." };
  if (row.is_owner && input.is_active === false) return { ok: false, error: "No se puede desactivar al dueño." };

  const updates: Record<string, unknown> = {};
  if (input.full_name !== undefined) {
    const v = String(input.full_name).trim();
    if (v) updates.full_name = v;
    updates.name = v || row.full_name || row.name;
  }
  if (input.role !== undefined) updates.role = String(input.role).trim() || row.role;
  if (input.can_issue !== undefined) updates.can_issue = input.can_issue;
  if (input.can_redeem !== undefined) updates.can_redeem = input.can_redeem;
  if (input.is_active !== undefined && !row.is_owner) updates.is_active = input.is_active;

  if (Object.keys(updates).length === 0) return { ok: true };

  const { error } = await supabaseAdmin()
    .from("cafe_staff")
    .update(updates)
    .eq("id", input.id)
    .eq("cafe_id", cafeId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type OwnerPromoRow = {
  id: string;
  title: string;
  description: string | null;
  image_code: string | null;
  is_active: boolean;
};

export async function getOwnerCafePromos(): Promise<OwnerPromoRow[]> {
  const session = await getSession();
  if (!session || session.role !== "owner") return [];
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return [];
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return [];

  const { data, error } = await supabaseAdmin()
    .from("cafe_promos")
    .select("id, title, description, image_code, is_active")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as OwnerPromoRow[];
}

export async function toggleOwnerPromo(
  promoId: string,
  is_active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "owner") return { ok: false, error: "No autorizado" };
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return { ok: false, error: "Solo el dueño puede gestionar promos" };
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return { ok: false, error: "Cafetería no asociada" };

  const { error } = await supabaseAdmin()
    .from("cafe_promos")
    .update({ is_active })
    .eq("id", promoId)
    .eq("cafe_id", cafeId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type OwnerReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author_name: string | null;
  author_cedula: string | null;
};

export type OwnerReviewsResult = {
  stats: { avg_rating: number; reviews_count: number } | null;
  reviews: OwnerReviewRow[];
};

export async function getOwnerCafeReviews(): Promise<OwnerReviewsResult> {
  const session = await getSession();
  if (!session || session.role !== "owner") return { stats: null, reviews: [] };
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) return { stats: null, reviews: [] };
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return { stats: null, reviews: [] };

  const supabase = supabaseAdmin();

  let stats: { avg_rating: number; reviews_count: number } | null = null;
  try {
    const { data: statsData } = await supabase
      .from("v_cafe_reviews_stats")
      .select("avg_rating, reviews_count")
      .eq("cafe_id", cafeId)
      .maybeSingle();
    if (statsData) {
      stats = {
        avg_rating: Number((statsData as { avg_rating?: number }).avg_rating ?? 0),
        reviews_count: Number((statsData as { reviews_count?: number }).reviews_count ?? 0),
      };
    }
  } catch {
    // ignore
  }

  const { data: reviewsData } = await supabase
    .from("cafe_reviews")
    .select("id, rating, comment, created_at, profile_id")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false })
    .limit(50);

  const reviews = (reviewsData ?? []) as Array<{ id: string; rating: number; comment: string | null; created_at: string; profile_id: string }>;
  const profileIds = [...new Set(reviews.map((r) => r.profile_id))];
  let profilesMap: Record<string, { full_name: string | null; cedula: string | null }> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, cedula").in("id", profileIds);
    for (const p of profiles ?? []) {
      const row = p as { id: string; full_name?: string | null; cedula?: string | null };
      profilesMap[row.id] = { full_name: row.full_name ?? null, cedula: row.cedula ?? null };
    }
  }

  const result: OwnerReviewRow[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    author_name: profilesMap[r.profile_id]?.full_name ?? null,
    author_cedula: profilesMap[r.profile_id]?.cedula ?? null,
  }));

  return { stats, reviews: result };
}

export type OwnerKpisRow = {
  days: number;
  movimientos: number;
  generado: number;
  canjeado: number;
  neto: number;
  clientes_unicos: number;
};

export async function getOwnerCafeKpis(days: number): Promise<OwnerKpisRow> {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return { days: 0, movimientos: 0, generado: 0, canjeado: 0, neto: 0, clientes_unicos: 0 };
  }
  const { getOwnerContext } = await import("@/app/actions/ownerContext");
  const ctx = await getOwnerContext();
  if (!ctx || !ctx.capabilities.isOwner) {
    return { days: 0, movimientos: 0, generado: 0, canjeado: 0, neto: 0, clientes_unicos: 0 };
  }
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return { days: 0, movimientos: 0, generado: 0, canjeado: 0, neto: 0, clientes_unicos: 0 };

  const d = Math.min(365, Math.max(1, days));
  const since = new Date();
  since.setDate(since.getDate() - d);
  const sinceIso = since.toISOString();

  const { data: txs, error } = await supabaseAdmin()
    .from("point_transactions")
    .select("to_profile_id, from_profile_id, amount, tx_type")
    .eq("cafe_id", cafeId)
    .gte("created_at", sinceIso);

  if (error) {
    return { days: d, movimientos: 0, generado: 0, canjeado: 0, neto: 0, clientes_unicos: 0 };
  }

  const rows = txs ?? [];
  let generado = 0;
  let canjeado = 0;
  const clientesUnicos = new Set<string>();

  for (const t of rows) {
    const amt = Number(t.amount);
    const txType = (t as { tx_type?: string }).tx_type;
    if (txType === "earn" && t.to_profile_id) {
      generado += amt;
      clientesUnicos.add(t.to_profile_id);
    }
    if (txType === "redeem" && t.from_profile_id) canjeado += amt;
    if (t.to_profile_id) clientesUnicos.add(t.to_profile_id);
  }

  return {
    days: d,
    movimientos: rows.length,
    generado,
    canjeado,
    neto: generado - canjeado,
    clientes_unicos: clientesUnicos.size,
  };
}
