"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { hashPin } from "@/lib/security/pin";
import { supabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  full_name: z.string().min(2, "Nombre requerido"),
  cedula: z.string().regex(/^\d{8}$/, "La cédula debe tener 8 dígitos"),
  pin: z.string().min(4, "PIN mínimo 4 caracteres").max(4, "PIN 4 dígitos"),
  phone: z.string().optional(),
  cafe_id: z.string().uuid("Cafetería requerida"),
});

export type CreateOwnerForCafeInput = {
  full_name: string;
  cedula: string;
  pin: string;
  phone?: string;
  cafe_id: string;
};

export async function createOwnerForCafe(input: CreateOwnerForCafeInput): Promise<
  | { ok: true; owner: { id: string; full_name: string; cedula: string; cafe_id: string; role: string } }
  | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "No autorizado" };

  const cedulaNorm = (input.cedula ?? "").replace(/\D/g, "").trim();
  const parsed = schema.safeParse({
    full_name: (input.full_name ?? "").trim(),
    cedula: cedulaNorm,
    pin: (input.pin ?? "").trim(),
    phone: input.phone?.trim(),
    cafe_id: (input.cafe_id ?? "").trim(),
  });

  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors?.[0] ?? parsed.error.message ?? "Datos inválidos";
    return { ok: false, error: typeof msg === "string" ? msg : "Datos inválidos" };
  }

  const supabase = supabaseAdmin();

  const { data: cafe, error: cafeErr } = await supabase
    .from("cafes")
    .select("id")
    .eq("id", parsed.data.cafe_id)
    .maybeSingle();

  if (cafeErr || !cafe?.id) return { ok: false, error: "La cafetería no existe" };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("cedula", parsed.data.cedula)
    .maybeSingle();

  if (existing?.id) return { ok: false, error: "Ya existe un usuario con esa cédula" };

  const pin_hash = await hashPin(parsed.data.pin);

  const { data: inserted, error: insertErr } = await supabase
    .from("profiles")
    .insert({
      full_name: parsed.data.full_name,
      cedula: parsed.data.cedula,
      pin_hash,
      role: "owner",
      cafe_id: parsed.data.cafe_id,
      is_active: true,
      phone: parsed.data.phone?.trim() || null,
    })
    .select("id, full_name, cedula, cafe_id, role")
    .single();

  if (insertErr || !inserted) return { ok: false, error: insertErr?.message ?? "No se pudo crear el owner" };

  const row = inserted as { id: string; full_name?: string; cedula?: string; cafe_id?: string; role?: string };
  return {
    ok: true,
    owner: {
      id: row.id,
      full_name: row.full_name ?? parsed.data.full_name,
      cedula: row.cedula ?? parsed.data.cedula,
      cafe_id: row.cafe_id ?? parsed.data.cafe_id,
      role: row.role ?? "owner",
    },
  };
}

export type CafeForSelect = { id: string; name: string };

export async function getCafesForSelect(): Promise<CafeForSelect[]> {
  const session = await getSession();
  if (!session || session.role !== "admin") return [];

  const { data, error } = await supabaseAdmin()
    .from("cafes")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) return [];
  return (data ?? []).map((r: { id: string; name?: string | null }) => ({
    id: r.id,
    name: r.name ?? "—",
  }));
}
