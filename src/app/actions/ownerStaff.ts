"use server";

import { getOwnerContext } from "@/app/actions/ownerContext";
import { getSession } from "@/lib/auth/session";
import { hashPin } from "@/lib/security/pin";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Fila de public.cafe_staff (listado y edición). */
export type CafeStaffRow = {
  id: string;
  cafe_id: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  can_issue: boolean;
  can_redeem: boolean;
  is_owner: boolean;
  cedula: string | null;
  created_at: string | null;
};

/** Contexto del staff logueado (para /app/staff). Devuelve null si no es staff o no existe el registro. */
export async function getStaffContext(): Promise<{
  staffId: string;
  cafeId: string;
  staffName: string | null;
  cafeName: string | null;
  canIssue: boolean;
  canRedeem: boolean;
  isActive: boolean;
} | null> {
  const session = await getSession();
  if (!session || session.role !== "staff" || !session.staffId) return null;
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return null;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("cafe_staff")
    .select("id, cafe_id, full_name, name, is_active, can_issue, can_redeem, cafes(name)")
    .eq("id", session.staffId)
    .eq("cafe_id", cafeId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const cafes = row.cafes as { name?: string } | null | undefined;
  const cafeName = cafes?.name ?? null;
  const staffName = (row.full_name ?? row.name ?? null) as string | null;
  return {
    staffId: row.id as string,
    cafeId: row.cafe_id as string,
    staffName: staffName ?? null,
    cafeName: cafeName ?? null,
    canIssue: row.can_issue !== false,
    canRedeem: row.can_redeem !== false,
    isActive: row.is_active !== false,
  };
}

/** Solo el dueño puede gestionar personal. */
async function ownerGuard(): Promise<{ cafeId: string }> {
  const session = await getSession();
  if (!session || session.role !== "owner") throw new Error("No autorizado");
  const ctx = await getOwnerContext();
  if (!ctx) throw new Error("Sin cafetería asignada");
  if (!ctx.capabilities.isOwner) throw new Error("FORBIDDEN: Solo el dueño puede gestionar personal");
  const cafeId = session.cafeId ?? null;
  if (!cafeId) throw new Error("Sin cafetería asignada");
  return { cafeId };
}

/** Listado de empleados desde public.cafe_staff; cedula desde cafe_staff o profiles (join por profile_id). */
export async function getOwnerStaff(): Promise<CafeStaffRow[]> {
  const { cafeId } = await ownerGuard();
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("cafe_staff")
    .select("id, cafe_id, full_name, name, role, is_active, can_issue, can_redeem, is_owner, cedula, created_at, profiles(cedula)")
    .eq("cafe_id", cafeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getOwnerStaff error:", error);
    throw new Error(error.message ?? "No se pudo cargar el personal.");
  }
  return (data ?? []).map((r: Record<string, unknown>) => {
    const profilesRow = r.profiles as { cedula?: string } | null | undefined;
    const cedulaFromProfile = profilesRow?.cedula ?? null;
    return {
      id: r.id as string,
      cafe_id: r.cafe_id as string,
      full_name: (r.full_name ?? r.name ?? null) as string | null,
      role: (r.role ?? "") as string,
      is_active: r.is_active !== false,
      can_issue: r.can_issue !== false,
      can_redeem: r.can_redeem !== false,
      is_owner: !!r.is_owner,
      cedula: ((r.cedula ?? cedulaFromProfile) as string) || null,
      created_at: (r.created_at ?? null) as string | null,
    };
  }) as CafeStaffRow[];
}

export type CreateOwnerStaffPayload = {
  full_name: string;
  role: string;
  cedula: string;
  pin_4: string;
  can_issue: boolean;
  can_redeem: boolean;
  is_active: boolean;
};

/** Resultado exitoso de creación: staffId y profileId. */
export type CreateOwnerStaffSuccess = { ok: true; staffId: string; profileId: string };
export type CreateOwnerStaffFailure = { ok: false; error: string };

/** Alta de empleado en una transacción: profile (role=staff) + cafe_staff con profile_id. Usa RPC y service role. */
export async function createOwnerStaff(payload: CreateOwnerStaffPayload): Promise<CreateOwnerStaffSuccess | CreateOwnerStaffFailure> {
  let cafeId: string;
  try {
    const g = await ownerGuard();
    cafeId = g.cafeId;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }

  const full_name = (payload.full_name ?? "").trim();
  const role = (payload.role ?? "").trim();
  const cedula = (payload.cedula ?? "").replace(/\D/g, "").trim();
  const pin_4 = (payload.pin_4 ?? "").trim();

  if (full_name.length < 2) return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  if (role.length < 2) return { ok: false, error: "El rol es obligatorio." };
  if (!cedula) return { ok: false, error: "La cédula es obligatoria (solo dígitos)." };
  if (!/^\d+$/.test(cedula)) return { ok: false, error: "La cédula debe contener solo dígitos." };
  if (!/^\d{4}$/.test(pin_4)) return { ok: false, error: "El PIN debe ser exactamente 4 dígitos." };

  let pin_hash: string;
  try {
    pin_hash = await hashPin(pin_4);
  } catch {
    return { ok: false, error: "Error al procesar el PIN." };
  }

  const supabase = supabaseAdmin();

  const { data, error } = await supabase.rpc("create_staff_with_profile", {
    p_cafe_id: cafeId,
    p_full_name: full_name,
    p_role: role || "Staff",
    p_cedula: cedula,
    p_pin_hash: pin_hash,
    p_can_issue: payload.can_issue !== false,
    p_can_redeem: payload.can_redeem !== false,
    p_is_active: payload.is_active !== false,
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? error.message ?? "";
    return { ok: false, error: msg || "No se pudo crear el empleado." };
  }

  const raw = data as { staff_id?: string; profile_id?: string } | null;
  const staffId = raw?.staff_id ?? "";
  const profileId = raw?.profile_id ?? "";
  if (!staffId || !profileId) {
    return { ok: false, error: "No se recibió el id del empleado o del perfil." };
  }

  return { ok: true, staffId, profileId };
}

export type UpdateOwnerStaffPayload = {
  staff_id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  can_issue: boolean;
  can_redeem: boolean;
};

/** Editar empleado: update public.cafe_staff. No se permite cambiar cédula. */
export async function updateOwnerStaff(payload: UpdateOwnerStaffPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  let cafeId: string;
  try {
    const g = await ownerGuard();
    cafeId = g.cafeId;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }

  const full_name = (payload.full_name ?? "").trim();
  const role = (payload.role ?? "").trim();
  if (full_name.length < 2) return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  if (role.length < 2) return { ok: false, error: "El rol es obligatorio." };

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("cafe_staff")
    .update({
      full_name,
      name: full_name,
      role,
      is_active: payload.is_active,
      can_issue: payload.can_issue,
      can_redeem: payload.can_redeem,
    })
    .eq("id", payload.staff_id)
    .eq("cafe_id", cafeId);

  if (error) {
    const msg = (error as { message?: string }).message ?? error.message ?? "";
    return { ok: false, error: msg };
  }
  return { ok: true };
}

/** Reset PIN: update pin_hash en public.cafe_staff por staff id. */
export async function resetOwnerStaffPin(staff_id: string, pin_4: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let cafeId: string;
  try {
    const g = await ownerGuard();
    cafeId = g.cafeId;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado" };
  }

  const pin = (pin_4 ?? "").trim();
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "El PIN debe ser exactamente 4 dígitos." };

  let pin_hash: string;
  try {
    pin_hash = await hashPin(pin);
  } catch {
    return { ok: false, error: "Error al procesar el PIN." };
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("cafe_staff")
    .update({ pin_hash })
    .eq("id", staff_id)
    .eq("cafe_id", cafeId);

  if (error) {
    const msg = (error as { message?: string }).message ?? error.message ?? "";
    return { ok: false, error: msg };
  }
  return { ok: true };
}
