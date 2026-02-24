import { getOwnerContext } from "@/app/actions/ownerContext";
import { getSession } from "@/lib/auth/session";
import { getDashboardPath } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import OwnerPanelClient from "./OwnerPanelClient";

export default async function OwnerPage() {
  const session = await getSession();

  if (!session) redirect("/login?mode=owner");
  if (session.role !== "owner") redirect(getDashboardPath(session.role));

  const ctx = await getOwnerContext();
  if (!ctx) {
    redirect("/login?mode=owner");
  }

  const cafeForClient = {
    id: ctx.cafe.id,
    name: ctx.cafe.name,
    image_code: ctx.cafe.image_code ?? null,
    image_path: (ctx.cafe as { image_path?: string | null }).image_path ?? null,
    city: ctx.cafe.city ?? null,
    address: ctx.cafe.address ?? null,
    phone: ctx.cafe.phone ?? null,
    email: ctx.cafe.email ?? null,
    instagram: ctx.cafe.instagram ?? null,
    description: ctx.cafe.description ?? null,
    hours_text: ctx.cafe.hours_text ?? null,
  };

  return (
    <OwnerPanelClient
      me={{ full_name: ctx.staff?.full_name ?? session.fullName ?? null, cedula: "" }}
      myCafe={cafeForClient}
      capabilities={ctx.capabilities}
    />
  );
}
