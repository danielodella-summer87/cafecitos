"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  ownerName: z.string().min(2),
  ownerCedula: z.string().min(6),
  ownerPin: z.string().min(4),
  cafeName: z.string().min(2),
});

export async function createOwnerAndCafe(input: {
  ownerName: string;
  ownerCedula: string;
  ownerPin: string;
  cafeName: string;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "No autorizado" };

  const parsed = schema.safeParse({
    ownerName: String(input.ownerName ?? "").trim(),
    ownerCedula: String(input.ownerCedula ?? "").replace(/\D/g, ""),
    ownerPin: String(input.ownerPin ?? "").trim(),
    cafeName: String(input.cafeName ?? "").trim(),
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const supabase = supabaseAdmin();

  // 1) Crear café
  const { data: cafe, error: cafeErr } = await supabase
    .from("cafes")
    .insert({ name: parsed.data.cafeName })
    .select("id, name")
    .single();

  if (cafeErr || !cafe) return { ok: false, error: cafeErr?.message ?? "No se pudo crear la cafetería" };

  // 2) Crear owner + vincularlo al café
  const pin_hash = bcrypt.hashSync(parsed.data.ownerPin, 10);

  const { error: ownerErr } = await supabase.from("profiles").insert({
    role: "owner",
    cedula: parsed.data.ownerCedula,
    full_name: parsed.data.ownerName,
    pin_hash,
    cafe_id: cafe.id,
  });

  if (ownerErr) {
    return { ok: false, error: ownerErr.message };
  }

  // (opcional) registrar en cafe_owners si tu esquema lo usa
  try {
    await supabase.from("cafe_owners").insert({ cafe_id: cafe.id, owner_cedula: parsed.data.ownerCedula });
  } catch {
    // ignorar si la tabla no existe o falla
  }

  return { ok: true, cafeName: cafe.name };
}

export async function createOwner(formData: FormData) {
  const res = await createOwnerAndCafe({
    ownerName: String(formData.get("full_name") ?? "").trim(),
    ownerCedula: String(formData.get("cedula") ?? "").trim(),
    ownerPin: String(formData.get("pin") ?? "").trim(),
    cafeName: String(formData.get("cafe_name") ?? "").trim(),
  });
  if (!res.ok) throw new Error(res.error);
  return { ok: true };
}
