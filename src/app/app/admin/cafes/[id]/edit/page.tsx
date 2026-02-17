import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import EditCafeClient from "./EditCafeClient";

type Props = { params: Promise<{ id: string }> };

export default async function EditCafePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/app");

  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: cafe, error: cafeErr } = await supabase
    .from("cafes")
    .select("id, name, city, address, phone, email, instagram, description, image_code, is_active, hours_text")
    .eq("id", id)
    .maybeSingle();

  if (cafeErr || !cafe) {
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

  return (
    <EditCafeClient
      cafe={{
        ...cafe,
        image_code: (cafe.image_code ?? "").toString().padStart(2, "0") || null,
      }}
      staff={safeStaff}
    />
  );
}
