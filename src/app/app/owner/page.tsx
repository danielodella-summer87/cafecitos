import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import OwnerPanelClient from "./OwnerPanelClient";

export default async function OwnerPage() {
  const session = await getSession();

  if (!session || session.role !== "owner") {
    redirect("/login?mode=owner");
  }

  // ...tu render
  const supabase = supabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, cedula")
    .eq("id", session.profileId)
    .maybeSingle();

  const cafeId = session.cafeId ?? null;
  const { data: myCafe } = cafeId
    ? await supabase.from("cafes").select("id, name, image_code").eq("id", cafeId).single()
    : { data: null };

  return (
    <OwnerPanelClient
      me={{ full_name: profile?.full_name ?? session.fullName ?? null, cedula: profile?.cedula ?? "" }}
      myCafe={myCafe ? { name: myCafe.name, image_code: myCafe.image_code ?? null } : null}
    />
  );
}
