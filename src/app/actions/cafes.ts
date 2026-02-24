"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CreateCafeInput = {
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  description?: string;
  hours_text?: string;
  image_code: string; // "01".."99"
  lat?: number | null;
  lng?: number | null;
  staff: Array<{
    name: string;
    role: string;
    profile_id?: string;
  }>;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const toNullableFloat = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

async function getNextAvailableImageCode(): Promise<string> {
  const sb = supabaseAdmin();

  const { data, error } = await sb.from("cafes").select("image_code");
  if (error) throw new Error(`getNextAvailableImageCode: ${error.message}`);

  const used = new Set(
    (data ?? [])
      .map((r: { image_code?: string | null }) => (r?.image_code ?? "").toString())
      .filter((v: string) => /^[0-9]{2}$/.test(v))
  );

  for (let i = 1; i <= 99; i++) {
    const code = pad2(i);
    if (!used.has(code)) return code;
  }
  throw new Error("No hay códigos disponibles (01..99).");
}

/** Devuelve el próximo image_code disponible (01..99) para mostrar en el formulario. */
export async function getNextImageCode(): Promise<string> {
  return getNextAvailableImageCode();
}

/** Buscar profile por cédula (solo admin). Para Personas autorizadas en Edit Cafetería. */
export async function lookupProfileByCedula(cedula: string): Promise<{ id: string; full_name: string | null } | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("No autorizado");
  const ced = (cedula ?? "").replace(/\D/g, "").trim();
  if (ced.length !== 8) return null;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name")
    .eq("cedula", ced)
    .maybeSingle();
  if (error || !data) return null;
  return { id: (data as { id: string }).id, full_name: (data as { full_name?: string | null }).full_name ?? null };
}

export async function createCafe(
  input: Omit<CreateCafeInput, "image_code"> & { image_code?: string }
) {
  const sb = supabaseAdmin();

  const name = (input.name ?? "").trim();
  if (name.length < 5) throw new Error("El nombre debe tener al menos 5 caracteres.");

  const staff = (input.staff ?? [])
    .map((s) => {
      const role = (s.role ?? "staff").trim().toLowerCase();
      return {
        name: (s.name ?? "").trim(),
        role: role === "admin" ? "admin" : "staff",
        profile_id: s.profile_id?.trim() || undefined,
      };
    })
    .filter((s) => s.name.length > 0);

  if (staff.length > 5) throw new Error("Máximo 5 personas autorizadas.");

  const image_code =
    (input.image_code ?? "").trim() || (await getNextAvailableImageCode());
  const codePadded = /^[0-9]{2}$/.test(image_code) ? image_code : pad2(Number(image_code) || 1);

  const lat = input.lat != null && Number.isFinite(Number(input.lat)) ? Number(input.lat) : null;
  const lng = input.lng != null && Number.isFinite(Number(input.lng)) ? Number(input.lng) : null;
  if ((lat != null && lng == null) || (lat == null && lng != null)) {
    throw new Error("Lat/Lng inválidos.");
  }

  const { data: cafe, error: cafeErr } = await sb
    .from("cafes")
    .insert({
      name,
      city: input.city ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      instagram: input.instagram ?? null,
      description: input.description ?? null,
      hours_text: (input.hours_text ?? "").trim() || null,
      image_code: codePadded,
      is_active: true,
      lat: lat ?? null,
      lng: lng ?? null,
    })
    .select("id, name, image_code")
    .single();

  if (cafeErr) throw new Error(`createCafe insert cafes: ${cafeErr.message}`);

  const staffRows = staff
    .filter((p) => p.profile_id)
    .map((p) => ({
      cafe_id: cafe.id,
      full_name: (p.name ?? "").trim(),
      role: p.role === "admin" ? "admin" : "staff",
      profile_id: p.profile_id,
      can_issue: true,
      can_redeem: true,
      is_active: true,
    }));

  if (staffRows.length > 0) {
    const { error: staffErr } = await sb.from("cafe_staff").insert(staffRows);

    if (staffErr) {
      const msg = (staffErr as any)?.message ?? "";

      const looksLikeMissingCols =
        msg.includes("Could not find the 'can_issue' column") ||
        msg.includes("Could not find the 'can_redeem' column");

      if (!looksLikeMissingCols) {
        throw new Error(`createCafe insert cafe_staff: ${msg}`);
      }

      const fallbackStaff = staffRows.map(({ can_issue, can_redeem, ...rest }) => rest);

      const { error: staffErr2 } = await sb.from("cafe_staff").insert(fallbackStaff);
      if (staffErr2) throw new Error(`createCafe insert cafe_staff (fallback): ${(staffErr2 as any)?.message ?? ""}`);
    }
  }

  return cafe as { id: string; name: string; image_code: string };
}

export type CafeListItem = {
  id: string;
  name: string;
  is_active: boolean;
  image_code: string | null;
  image_path?: string | null;
};

/** Lista cafeterías (Consumer + Admin). Incluye image_path para imagen de cafetería. */
export async function getCafes(): Promise<CafeListItem[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("cafes")
    .select("id, name, is_active, image_code, image_path")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getCafes: ${error.message}`);
  return (data ?? []) as CafeListItem[];
}

export type UpdateCafeInput = {
  id: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  description?: string;
  hours_text?: string;
  image_code: string;
  is_active?: boolean;
  lat?: number | null;
  lng?: number | null;
  staff: Array<{ name: string; role: string; profile_id?: string }>;
};

export async function updateCafe(input: UpdateCafeInput) {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("No autorizado");

  const sb = supabaseAdmin();
  const id = input.id;
  const name = (input.name ?? "").trim();
  if (name.length < 5) throw new Error("El nombre debe tener al menos 5 caracteres.");

  const staffRaw = (input.staff ?? [])
    .map((s) => {
      const role = (s.role ?? "staff").trim().toLowerCase();
      if (role === "owner" || role === "dueño/a" || role === "dueño") {
        throw new Error("El rol owner/Dueño no se asigna en Personas autorizadas. Solo admin o staff.");
      }
      return {
        name: (s.name ?? "").trim(),
        role: role === "admin" ? "admin" : "staff",
        profile_id: s.profile_id?.trim() || undefined,
      };
    })
    .filter((s) => s.name.length > 0);

  const staffWithoutProfile = staffRaw.find((s) => !s.profile_id);
  if (staffWithoutProfile) {
    throw new Error("Cada persona autorizada debe tener profile_id. Buscá por cédula y seleccioná el usuario.");
  }

  const staff = staffRaw;
  if (staff.length > 5) throw new Error("Máximo 5 personas autorizadas.");

  const image_code = (input.image_code ?? "").toString().trim().padStart(2, "0") || "01";

  const { data: cafe, error: upErr } = await sb
    .from("cafes")
    .update({
      name,
      city: (input.city ?? "").trim() || null,
      address: (input.address ?? "").trim() || null,
      phone: (input.phone ?? "").trim() || null,
      email: (input.email ?? "").trim() || null,
      instagram: (input.instagram ?? "").trim() || null,
      description: (input.description ?? "").trim() || null,
      hours_text: (input.hours_text ?? "").trim() || null,
      image_code,
      is_active: input.is_active ?? true,
      lat: toNullableFloat(input.lat),
      lng: toNullableFloat(input.lng),
    })
    .eq("id", id)
    .select("id, name, image_code, is_active")
    .single();

  if (upErr) throw new Error(`updateCafe: ${upErr.message}`);

  await sb.from("cafe_staff").delete().eq("cafe_id", id);

  const staffRows = staff
    .filter((p) => p.profile_id)
    .map((p) => ({
      cafe_id: id,
      full_name: p.name,
      role: p.role,
      profile_id: p.profile_id,
      can_issue: true,
      can_redeem: true,
      is_active: true,
    }));

  if (staffRows.length > 0) {
    const { error: staffErr } = await sb.from("cafe_staff").insert(staffRows);

    if (staffErr) {
      const msg = (staffErr as Error)?.message ?? "";
      const missingCols =
        msg.includes("Could not find the 'can_issue' column") ||
        msg.includes("Could not find the 'can_redeem' column");
      if (!missingCols) throw new Error(`updateCafe staff: ${msg}`);
      const fallback = staffRows.map(({ can_issue, can_redeem, ...rest }) => rest);
      const { error: e2 } = await sb.from("cafe_staff").insert(fallback);
      if (e2) throw new Error(`updateCafe staff: ${(e2 as Error).message}`);
    }
  }

  return cafe as { id: string; name: string; image_code: string; is_active: boolean };
}
