import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatCreatedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:${min}`;
  } catch {
    return String(iso);
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = supabaseAdmin();

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, role, full_name, cedula, phone, created_at")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const rowsClientes = (profilesData ?? []).map((p: Record<string, unknown>) => ({
    Rol: p.role ?? "",
    Nombre: p.full_name ?? "",
    Cédula: p.cedula ?? "",
    Teléfono: p.phone ?? "",
    Creado: formatCreatedAt(p.created_at as string),
  }));

  const { data: staffData, error: staffError } = await supabase
    .from("cafe_staff")
    .select("id, full_name, name, cedula, created_at, is_active, can_issue, can_redeem, is_owner, cafe_id")
    .order("cafe_id", { ascending: true })
    .order("full_name", { ascending: true });

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  const cafeIds = [...new Set((staffData ?? []).map((s: Record<string, unknown>) => s.cafe_id as string).filter(Boolean))];
  let cafesMap: Record<string, string> = {};
  if (cafeIds.length > 0) {
    const { data: cafes } = await supabase.from("cafes").select("id, name").in("id", cafeIds);
    cafesMap = (cafes ?? []).reduce((acc: Record<string, string>, c: Record<string, unknown>) => {
      acc[c.id as string] = (c.name as string) ?? "";
      return acc;
    }, {});
  }

  const rowsStaff = (staffData ?? []).map((s: Record<string, unknown>) => ({
    Rol: s.is_owner ? "owner-staff" : "staff",
    Nombre: s.full_name ?? s.name ?? "",
    Cédula: s.cedula ?? "",
    Teléfono: "",
    Cafetería: cafesMap[(s.cafe_id as string) ?? ""] ?? "",
    Activo: s.is_active ? "Sí" : "No",
    Permisos: `Asignar:${s.can_issue ? "Sí" : "No"} | Cobrar:${s.can_redeem ? "Sí" : "No"}`,
    Creado: formatCreatedAt(s.created_at as string),
  }));

  const wb = XLSX.utils.book_new();
  const wsClientes = XLSX.utils.json_to_sheet(rowsClientes);
  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");
  const wsStaff = XLSX.utils.json_to_sheet(rowsStaff);
  XLSX.utils.book_append_sheet(wb, wsStaff, "Staff");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="clientes.xlsx"',
    },
  });
}
