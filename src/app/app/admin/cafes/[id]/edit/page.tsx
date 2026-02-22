import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import EditCafeClient from "./EditCafeClient";

type Props = { params: Promise<{ id: string }> };

const BASE_COLUMNS =
  "id, name, city, address, phone, email, instagram, description, image_code, is_active, hours_text";

export default async function EditCafePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/app");

  const { id } = await params;
  const supabase = supabaseAdmin();

  // Intentar con lat/lng; si la columna no existe (migración no corrida), cargar sin ellas
  let cafe: Record<string, unknown> | null = null;
  const { data: cafeWithCoords, error: errWithCoords } = await supabase
    .from("cafes")
    .select(`${BASE_COLUMNS}, lat, lng`)
    .eq("id", id)
    .maybeSingle();

  if (errWithCoords) {
    const msg = (errWithCoords as { message?: string })?.message ?? "";
    const missingColumn = /column.*(lat|lng).*does not exist/i.test(msg) || msg.includes("lat") || msg.includes("lng");
    if (missingColumn) {
      const { data: cafeBase, error: errBase } = await supabase
        .from("cafes")
        .select(BASE_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (!errBase && cafeBase) cafe = { ...cafeBase, lat: null, lng: null };
    }
  } else if (cafeWithCoords) {
    cafe = cafeWithCoords as Record<string, unknown>;
  }

  if (!cafe) {
    redirect("/app/admin/cafes");
  }

  const { data: staff, error: staffErr } = await supabase
    .from("cafe_staff")
    .select("id, cafe_id, full_name, role, is_owner")
    .eq("cafe_id", id)
    .order("is_owner", { ascending: false });

  let safeStaff: { id?: string; name: string; role: string; is_owner: boolean }[];
  if (staffErr) {
    const { data: staffAlt } = await supabase
      .from("cafe_staff")
      .select("id, cafe_id, name, role, is_owner")
      .eq("cafe_id", id)
      .order("is_owner", { ascending: false });
    safeStaff = (staffAlt ?? []).map((p: { id?: string; name?: string | null; role?: string | null; is_owner?: boolean }) => ({
      id: p.id,
      name: (p.name ?? "").toString(),
      role: (p.role ?? "").toString(),
      is_owner: !!p.is_owner,
    }));
  } else {
    safeStaff = (staff ?? []).map((p: { id?: string; full_name?: string | null; role?: string | null; is_owner?: boolean }) => ({
      id: p.id,
      name: (p.full_name ?? "").toString(),
      role: (p.role ?? "").toString(),
      is_owner: !!p.is_owner,
    }));
  }

  const imageCode = (cafe.image_code ?? "").toString().padStart(2, "0") || null;
  return (
    <EditCafeClient
      cafe={{
        id: String(cafe.id),
        name: cafe.name != null ? String(cafe.name) : null,
        city: cafe.city != null ? String(cafe.city) : null,
        address: cafe.address != null ? String(cafe.address) : null,
        phone: cafe.phone != null ? String(cafe.phone) : null,
        email: cafe.email != null ? String(cafe.email) : null,
        instagram: cafe.instagram != null ? String(cafe.instagram) : null,
        description: cafe.description != null ? String(cafe.description) : null,
        image_code: imageCode,
        is_active: cafe.is_active != null ? Boolean(cafe.is_active) : true,
        hours_text: cafe.hours_text != null ? String(cafe.hours_text) : null,
        lat: cafe.lat != null && typeof cafe.lat === "number" ? cafe.lat : null,
        lng: cafe.lng != null && typeof cafe.lng === "number" ? cafe.lng : null,
      }}
      staff={safeStaff}
      debugRole={session.role}
      debugCafeId={id}
    />
  );
}
