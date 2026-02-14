"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { COOKIE_NAME, signSessionToken } from "@/lib/auth/session";

function normalizeCedula(v: string) {
  return (v ?? "").toString().replace(/\D/g, "");
}

const loginSchema = z.object({
  cedula: z.string().min(1),
  pin: z.string().min(1),
});

export type LoginResult =
  | { ok: true; role: "owner" | "consumer"; redirectTo: string }
  | { ok: false; error: string };

export async function loginUser(formData: FormData): Promise<LoginResult> {
  const rawCedula = String(formData.get("cedula") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const mode = String(formData.get("mode") || "");

  const cedula = normalizeCedula(rawCedula);

  const parsed = loginSchema.safeParse({ cedula, pin });
  if (!parsed.success) {
    return { ok: false, error: "Ingresá tu cédula y tu PIN" };
  }

  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, pin_hash, cafe_id, full_name")
    .eq("cedula", cedula)
    .single();

  if (error || !data) {
    return { ok: false, error: "Usuario no encontrado" };
  }

  const valid = await bcrypt.compare(pin, data.pin_hash);
  if (!valid) return { ok: false, error: "PIN incorrecto" };

  const role = data.role as "owner" | "consumer";

  // /login (sin mode) = solo consumer
  if (mode !== "owner") {
    if (role === "owner") {
      return { ok: false, error: "Este acceso es para consumidores. Usá Modo Owner." };
    }
  }

  // /login?mode=owner = solo owner
  if (mode === "owner") {
    if (role !== "owner") {
      return { ok: false, error: "Este acceso es para dueños de cafetería." };
    }
  }

  const token = signSessionToken({
    profileId: data.id,
    role: data.role as "owner" | "consumer",
    cafeId: (data as { cafe_id?: string }).cafe_id ?? null,
    fullName: (data as { full_name?: string }).full_name ?? null,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  if (role === "owner") {
    return { ok: true, role: "owner", redirectTo: "/app/owner" };
  }
  return { ok: true, role: "consumer", redirectTo: "/app/consumer" };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  redirect("/login");
}

// ================================
// CONSUMER REGISTRATION (registerUser)
// ================================
const registerConsumerSchema = z.object({
  cedula: z.string().min(1),
  pin: z.string().min(1),
  phone: z.string().optional(),
  full_name: z.string().optional(),
});

export async function registerUser(
  input: FormData | { cedula: string; pin: string; phone?: string; full_name?: string }
) {
  const data = input instanceof FormData
    ? {
        cedula: String(input.get("cedula") ?? "").trim(),
        pin: String(input.get("pin") ?? ""),
        phone: String(input.get("phone") ?? "").trim(),
        full_name: String(input.get("full_name") ?? "").trim(),
      }
    : input;
  const parsed = registerConsumerSchema.parse({
    cedula: data.cedula,
    pin: data.pin,
    phone: data.phone || undefined,
    full_name: data.full_name || undefined,
  });
  const supabase = supabaseAdmin();
  const normalizedCedula = normalizeCedula(parsed.cedula);
  const pin_hash = await bcrypt.hash(parsed.pin, 10);

  const { error: profileErr } = await supabase
    .from("profiles")
    .insert({
      full_name: parsed.full_name || null,
      cedula: normalizedCedula,
      role: "consumer",
      pin_hash,
      phone: parsed.phone || null,
    });

  if (profileErr) {
    console.error("Profile create error (consumer):", profileErr);
    throw new Error("No se pudo crear el usuario");
  }
}

// ================================
// OWNER REGISTRATION PRO
// ================================
export async function createOwner(input: FormData | { cafe_name: string; full_name: string; cedula: string; pin: string }) {
  const data = input instanceof FormData
    ? {
        cafe_name: String(input.get("cafe_name") ?? ""),
        full_name: String(input.get("full_name") ?? ""),
        cedula: String(input.get("cedula") ?? ""),
        pin: String(input.get("pin") ?? ""),
      }
    : input;
  const supabase = supabaseAdmin();
  const normalizedCedula = normalizeCedula(data.cedula);
  const pin_hash = await bcrypt.hash(data.pin, 10);

  // 1) Crear cafetería del owner
  const { data: cafe, error: cafeErr } = await supabase
    .from("cafes")
    .insert({
      name: data.cafe_name,
    })
    .select()
    .single();

  if (cafeErr || !cafe) {
    console.error("Cafe create error:", cafeErr);
    throw new Error("No se pudo crear la cafetería");
  }

  // 2) Crear profile owner con cafe_id
  const { error: profileErr } = await supabase
    .from("profiles")
    .insert({
      full_name: data.full_name,
      cedula: normalizedCedula,
      role: "owner",
      pin_hash,
      cafe_id: cafe.id,
    });

  if (profileErr) {
    console.error("Profile create error:", profileErr);
    throw new Error("No se pudo crear el owner");
  }
}
