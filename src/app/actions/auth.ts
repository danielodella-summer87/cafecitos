"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { setSessionCookie, signSessionToken, clearSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  cedula: z.string().min(6),
  pin: z.string().min(4),
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
    .select("id, role, cedula, full_name, cafe_id, pin_hash, phone, created_at, is_active")
    .eq("cedula", parsed.data.cedula)
    .single();

  if (error || !profile) return { ok: false, error: "Usuario no registrado" };
  if (profile.is_active === false) return { ok: false, error: "Usuario inactivo" };

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
  const registerSchema = z.object({
    cedula: z.string().min(6),
    pin: z.string().min(4).max(4),
    phone: z.string().optional(),
    full_name: z.string().optional(),
  });

  function normalizeCedula(v: unknown) {
    return String(v ?? "").trim().replace(/\D/g, "");
  }

  function normalizeInput(i: unknown): { cedula: string; pin: string; phone: string; full_name: string } {
    if (typeof FormData !== "undefined" && i instanceof FormData) {
      return {
        cedula: normalizeCedula(i.get("cedula")),
        pin: String(i.get("pin") ?? "").trim(),
        phone: String(i.get("phone") ?? "").trim(),
        full_name: String(i.get("full_name") ?? "").trim(),
      };
    }
    if (i && typeof i === "object" && "cedula" in i) {
      const o = i as { cedula?: unknown; pin?: unknown; phone?: unknown; full_name?: unknown };
      return {
        cedula: normalizeCedula(o.cedula),
        pin: String(o.pin ?? "").trim(),
        phone: String(o.phone ?? "").trim(),
        full_name: String(o.full_name ?? "").trim(),
      };
    }
    throw new Error("Input inválido");
  }

  const parsed = registerSchema.safeParse(normalizeInput(input));
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const safeName = (parsed.data.full_name ?? "").slice(0, 20);
  const phone = (parsed.data.phone ?? "").trim();
  const supabase = supabaseAdmin();

  const { data: existing } = await supabase.from("profiles").select("id").eq("cedula", parsed.data.cedula).maybeSingle();
  if (existing?.id) return { ok: false, error: "Ya existe un usuario con esa cédula" };

  const pin_hash = await bcrypt.hash(parsed.data.pin, 10);

  const { data: profileInserted, error: pErr } = await supabase
    .from("profiles")
    .insert({
      role: "consumer",
      cedula: parsed.data.cedula,
      pin_hash,
      full_name: safeName || "Cliente",
      phone: phone || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (pErr || !profileInserted) return { ok: false, error: pErr?.message ?? "No se pudo crear el usuario" };

  const { data: settings } = await supabase
    .from("settings_global")
    .select("welcome_bonus_points")
    .eq("id", true)
    .maybeSingle();

  const bonus = Math.max(0, Number(settings?.welcome_bonus_points ?? 5));
  if (bonus > 0) {
    const { error: txErr } = await supabase.from("point_transactions").insert({
      tx_type: "adjust",
      cafe_id: null,
      actor_owner_profile_id: null,
      to_profile_id: profileInserted.id,
      from_profile_id: null,
      amount: bonus,
      note: "Cortesía de bienvenida",
    });
    if (txErr) return { ok: false, error: `Usuario creado, pero no se pudo aplicar la cortesía: ${txErr.message}` };
  }

  // Loguear al usuario y redirigir a bienvenida (onboarding)
  const token = signSessionToken({
    profileId: profileInserted.id,
    role: "consumer",
    cafeId: null,
    fullName: safeName || "Cliente",
  });
  await setSessionCookie(token);

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
