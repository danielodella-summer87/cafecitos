"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDashboardPath, setSessionCookie, signSessionToken, clearSessionCookie } from "@/lib/auth/session";

const loginSchema = z.object({
  cedula: z.string().regex(/^\d{8}$/, "La cédula debe tener 8 dígitos"),
  pin: z.string().min(4),
});

const CreateOwnerSchema = z.object({
  cedula: z.string().regex(/^\d{8}$/, "La cédula debe tener 8 dígitos"),
  pin: z.string().min(3),
  full_name: z.string().min(2),
  cafe_name: z.string().min(2),
  phone: z.string().optional(),
});

function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}

/** Login dueño/empleado por cafe_staff (cédula + PIN). No registra empleados. */
export async function signInCafeStaff(input: { cedula: string; pin: string }) {
  const parsed = loginSchema.safeParse({ cedula: onlyDigits(input.cedula.trim()), pin: input.pin.trim() });
  if (!parsed.success) return { ok: false, error: "Ingresá cédula y PIN válidos" };

  const supabase = supabaseAdmin();
  const { data: rows } = await supabase
    .from("cafe_staff")
    .select("id, cafe_id, full_name, name, is_owner, can_issue, can_redeem, pin_hash, profile_id")
    .eq("cedula", parsed.data.cedula)
    .eq("is_active", true)
    .limit(1);

  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row?.id || !row.pin_hash) return { ok: false, error: "Credenciales incorrectas" };

  const valid = await bcrypt.compare(parsed.data.pin, row.pin_hash);
  if (!valid) return { ok: false, error: "PIN incorrecto" };

  const profileId = (row as { profile_id?: string | null }).profile_id ?? null;
  let role: "owner" | "staff" | "consumer" | "admin" = row.is_owner ? "owner" : "staff";
  if (profileId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", profileId)
      .maybeSingle();
    const profileRole = (profile as { role?: string } | null)?.role;
    if (profileRole === "owner" || profileRole === "admin" || profileRole === "staff" || profileRole === "consumer") {
      role = profileRole;
    }
  }

  const fullName = (row.full_name ?? row.name ?? "") as string;
  const token = signSessionToken({
    staffId: row.id,
    profileId,
    role,
    cafeId: row.cafe_id ?? null,
    fullName: fullName || null,
    is_owner: !!row.is_owner,
    can_issue: row.can_issue !== false,
    can_redeem: row.can_redeem !== false,
  });
  await setSessionCookie(token);

  const redirectTo = role === "staff" ? "/app/choose-mode" : getDashboardPath(role);
  if (process.env.NODE_ENV === "development") {
    console.log("[auth] signInCafeStaff", { cedula: parsed.data.cedula, role, redirectTo });
  }
  return { ok: true, redirectTo };
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

  // 1) Acceso cafetería: dueño/empleado por cafe_staff (cedula + PIN)
  const staffRes = await signInCafeStaff({ cedula: parsed.data.cedula, pin: parsed.data.pin });
  if (staffRes.ok) return staffRes;

  // 2) Usuario por profiles (consumidor, owner legacy, admin)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, cedula, full_name, cafe_id, pin_hash, phone, created_at, is_active")
    .eq("cedula", parsed.data.cedula)
    .single();

  if (error || !profile) return { ok: false, error: "Usuario no registrado" };
  if (profile.is_active === false) return { ok: false, error: "Usuario inactivo" };

  const valid = await bcrypt.compare(parsed.data.pin, profile.pin_hash);
  if (!valid) return { ok: false, error: "PIN incorrecto" };

  const role = (profile as { role?: string }).role;
  const validRoles = ["owner", "admin", "staff", "consumer"];
  if (!role || !validRoles.includes(role)) {
    return { ok: false, error: "Rol no válido. Contactá soporte." };
  }

  const token = signSessionToken({
    profileId: profile.id,
    role: role as "owner" | "admin" | "staff" | "consumer",
    cafeId: profile.cafe_id ?? null,
    fullName: profile.full_name ?? null,
  });

  await setSessionCookie(token);

  const redirectTo = role === "staff" ? "/app/choose-mode" : getDashboardPath(role as "owner" | "admin" | "consumer");
  if (process.env.NODE_ENV === "development") {
    console.log("[auth] loginUser profiles", { cedula: parsed.data.cedula, role, redirectTo });
  }
  return { ok: true, redirectTo };
}

export async function registerUser(
  input: FormData | { cedula: string; pin: string; confirm_pin?: string; phone: string; full_name?: string }
) {
  const registerSchema = z
    .object({
      cedula: z.string().regex(/^\d{8}$/, "La cédula debe tener 8 dígitos"),
      pin: z.string().min(4).max(4),
      confirm_pin: z.string().min(4).max(4),
      phone: z.string().min(1, "El teléfono es obligatorio"),
      full_name: z.string().optional(),
    })
    .refine((d) => d.pin === d.confirm_pin, { message: "Los PIN no coinciden", path: ["confirm_pin"] });

  function normalizeCedula(v: unknown) {
    return String(v ?? "").trim().replace(/\D/g, "");
  }

  function normalizeInput(i: unknown): {
    cedula: string;
    pin: string;
    confirm_pin: string;
    phone: string;
    full_name: string;
  } {
    if (typeof FormData !== "undefined" && i instanceof FormData) {
      return {
        cedula: normalizeCedula(i.get("cedula")),
        pin: String(i.get("pin") ?? "").trim(),
        confirm_pin: String(i.get("confirm_pin") ?? "").trim(),
        phone: String(i.get("phone") ?? "").trim(),
        full_name: String(i.get("full_name") ?? "").trim(),
      };
    }
    if (i && typeof i === "object" && "cedula" in i) {
      const o = i as {
        cedula?: unknown;
        pin?: unknown;
        confirm_pin?: unknown;
        phone?: unknown;
        full_name?: unknown;
      };
      return {
        cedula: normalizeCedula(o.cedula),
        pin: String(o.pin ?? "").trim(),
        confirm_pin: String(o.confirm_pin ?? "").trim(),
        phone: String(o.phone ?? "").trim(),
        full_name: String(o.full_name ?? "").trim(),
      };
    }
    throw new Error("Input inválido");
  }

  const parsed = registerSchema.safeParse(normalizeInput(input));
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors?.[0] ?? parsed.error.message ?? "Datos inválidos";
    return { ok: false, error: typeof msg === "string" ? msg : "Datos inválidos" };
  }

  const safeName = (parsed.data.full_name ?? "").slice(0, 20);
  const phone = parsed.data.phone.trim();
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
      phone,
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

/** Código DDMM (fecha de registro en America/Montevideo) para mostrar en bienvenida. Solo consumer. */
export async function getWelcomeCode(): Promise<{ code: string } | null> {
  const { getSession } = await import("@/lib/auth/session");
  const session = await getSession();
  if (!session || session.role !== "consumer" || !session.profileId) return null;
  const supabase = supabaseAdmin();
  const { data: row } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", session.profileId)
    .single();
  if (!row?.created_at) return null;
  const d = new Date(row.created_at);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return { code: day + month };
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
