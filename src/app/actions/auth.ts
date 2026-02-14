"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { setSessionCookie, signSessionToken, clearSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  cedula: z.string().min(6),
  pin: z.string().min(4),
});

const RegisterSchema = z.object({
  cedula: z.string().min(6),
  pin: z.string().min(3),
  phone: z.string().optional(),
  full_name: z.string().optional(),
});

const CreateOwnerSchema = z.object({
  cedula: z.string().min(6),
  pin: z.string().min(3),
  full_name: z.string().min(2),
  cafe_name: z.string().min(2),
  phone: z.string().optional(),
});

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

export async function loginUser(input: FormData | { cedula: string; pin: string }) {
  const raw =
    input instanceof FormData
      ? {
          cedula: String(input.get("cedula") ?? "").trim(),
          pin: String(input.get("pin") ?? "").trim(),
        }
      : {
          cedula: String(input.cedula ?? "").trim(),
          pin: String(input.pin ?? "").trim(),
        };

  const parsed = loginSchema.safeParse({ cedula: onlyDigits(raw.cedula), pin: raw.pin });
  if (!parsed.success) return { ok: false, error: "Ingresá cédula y PIN válidos" };

  const supabase = supabaseAdmin();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, cedula, full_name, cafe_id, pin_hash, phone, created_at")
    .eq("cedula", parsed.data.cedula)
    .single();

  if (error || !profile) return { ok: false, error: "Usuario no registrado" };

  const valid = await bcrypt.compare(parsed.data.pin, profile.pin_hash);
  if (!valid) return { ok: false, error: "PIN incorrecto" };

  const token = signSessionToken({
    profileId: profile.id,
    role: profile.role,
    cafeId: profile.cafe_id ?? null,
    fullName: profile.full_name ?? null,
  });

  await setSessionCookie(token);

  let redirectTo = "/app/consumer";
  if (profile.role === "owner") redirectTo = "/app/owner";
  if (profile.role === "admin") redirectTo = "/app/admin";

  return { ok: true, redirectTo };
}

export async function registerUser(input: FormData | { cedula: string; pin: string; phone?: string; full_name?: string }) {
  const cedula = input instanceof FormData ? String(input.get("cedula") ?? "") : input.cedula;
  const pin = input instanceof FormData ? String(input.get("pin") ?? "") : input.pin;
  const phone = input instanceof FormData ? String(input.get("phone") ?? "").trim() : (input.phone ?? "");
  const full_name = input instanceof FormData ? String(input.get("full_name") ?? "").trim() : (input.full_name ?? "");

  const parsed = RegisterSchema.safeParse({
    cedula: onlyDigits(cedula),
    pin,
    phone: phone || undefined,
    full_name: full_name || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const pin_hash = await bcrypt.hash(parsed.data.pin, 10);

  // Insert con SERVICE ROLE (evita problemas de RLS)
  const { error: profileErr } = await supabaseAdmin().from("profiles").insert({
    role: "consumer",
    cedula: parsed.data.cedula,
    pin_hash,
    phone: parsed.data.phone ?? null,
    full_name: parsed.data.full_name ?? null,
  });

  if (profileErr) {
    // Mostramos el error real para diagnosticar (unique, RLS, etc.)
    return { ok: false, error: profileErr.message };
  }

  return { ok: true };
}

export async function createOwner(input: FormData | { cedula: string; pin: string; full_name: string; cafe_name: string; phone?: string }) {
  const cedula = input instanceof FormData ? String(input.get("cedula") ?? "") : input.cedula;
  const pin = input instanceof FormData ? String(input.get("pin") ?? "") : input.pin;
  const full_name = input instanceof FormData ? String(input.get("full_name") ?? "").trim() : input.full_name;
  const cafe_name = input instanceof FormData ? String(input.get("cafe_name") ?? "").trim() : input.cafe_name;
  const phone = input instanceof FormData ? String(input.get("phone") ?? "").trim() : (input.phone ?? "");

  const parsed = CreateOwnerSchema.safeParse({
    cedula: onlyDigits(cedula),
    pin,
    full_name,
    cafe_name,
    phone: phone || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const pin_hash = await bcrypt.hash(parsed.data.pin, 10);

  const db = supabaseAdmin();
  const cafeInsert = await db.from("cafes").insert({ name: parsed.data.cafe_name }).select("id").single();
  if (cafeInsert.error) return { ok: false, error: cafeInsert.error.message };

  const profileInsert = await db.from("profiles").insert({
    role: "owner",
    cedula: parsed.data.cedula,
    pin_hash,
    full_name: parsed.data.full_name,
    phone: parsed.data.phone ?? null,
    cafe_id: cafeInsert.data.id,
  }).select("id, role, cafe_id").single();

  if (profileInsert.error) return { ok: false, error: profileInsert.error.message };

  // logueamos automáticamente al owner
  const token = signSessionToken({
    profileId: profileInsert.data.id,
    role: profileInsert.data.role,
    cafeId: profileInsert.data.cafe_id ?? null,
  });
  await setSessionCookie(token);

  return { ok: true };
}

export async function logout() {
  await clearSessionCookie();
  return { ok: true };
}
