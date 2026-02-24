"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type OwnerContextStaff = {
  id: string;
  full_name: string | null;
  role: string;
  is_owner: boolean;
  can_issue: boolean;
  can_redeem: boolean;
  is_active: boolean;
};

export type OwnerContextCapabilities = {
  isOwner: boolean;
  canIssue: boolean;
  canRedeem: boolean;
};

export type OwnerContextCafe = {
  id: string;
  name: string;
  image_code: string | null;
  image_path?: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  description: string | null;
  hours_text: string | null;
};

export type OwnerContext = {
  cafe: OwnerContextCafe;
  staff: OwnerContextStaff | null;
  capabilities: OwnerContextCapabilities;
};

const DEFAULT_CAPABILITIES: OwnerContextCapabilities = {
  isOwner: true,
  canIssue: true,
  canRedeem: true,
};

/** Resuelve cafetería del usuario logueado y sus permisos (owner por profile_id o por staff_id). */
export async function getOwnerContext(): Promise<OwnerContext | null> {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;
  const cafeId = session.cafeId ?? null;
  if (!cafeId) return null;

  const supabase = supabaseAdmin();

  const { data: cafe, error: cafeErr } = await supabase
    .from("cafes")
    .select("id, name, image_code, image_path, city, address, phone, email, instagram, description, hours_text")
    .eq("id", cafeId)
    .single();

  if (cafeErr || !cafe) return null;
  const cafeRow = cafe as OwnerContextCafe;

  let staff: OwnerContextStaff | null = null;
  let capabilities = DEFAULT_CAPABILITIES;

  // Dueño logueado por cafe_staff (cedula+pin): usar staffId y permisos de sesión
  if (session.staffId) {
    const { data: staffRow } = await supabase
      .from("cafe_staff")
      .select("id, full_name, name, role, is_owner, can_issue, can_redeem, is_active")
      .eq("id", session.staffId)
      .eq("cafe_id", cafeId)
      .maybeSingle();
    if (staffRow) {
      const row = staffRow as Record<string, unknown>;
      staff = {
        id: row.id as string,
        full_name: (row.full_name ?? row.name ?? "") as string | null,
        role: (row.role ?? "") as string,
        is_owner: !!row.is_owner,
        can_issue: row.can_issue !== false,
        can_redeem: row.can_redeem !== false,
        is_active: row.is_active !== false,
      };
      capabilities = {
        isOwner: session.is_owner ?? !!row.is_owner,
        canIssue: session.can_issue ?? row.can_issue !== false,
        canRedeem: session.can_redeem ?? row.can_redeem !== false,
      };
    }
  } else if (session.profileId) {
    const { data: staffRow, error: staffErr } = await supabase
      .from("cafe_staff")
      .select("id, full_name, name, role, is_owner, can_issue, can_redeem, is_active")
      .eq("cafe_id", cafeId)
      .eq("profile_id", session.profileId)
      .maybeSingle();

    if (!staffErr && staffRow) {
      const row = staffRow as Record<string, unknown>;
      staff = {
        id: row.id as string,
        full_name: (row.full_name ?? row.name ?? "") as string | null,
        role: (row.role ?? "") as string,
        is_owner: !!row.is_owner,
        can_issue: row.can_issue !== false,
        can_redeem: row.can_redeem !== false,
        is_active: row.is_active !== false,
      };
      capabilities = {
        isOwner: !!row.is_owner,
        canIssue: row.can_issue !== false,
        canRedeem: row.can_redeem !== false,
      };
    }
  }

  return {
    cafe: cafeRow,
    staff,
    capabilities,
  };
}
