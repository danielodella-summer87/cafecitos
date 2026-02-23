import { getSession } from "@/lib/auth/session";
import { getDashboardPath, getModeFromCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getConsumerSummary } from "@/app/actions/consumerSummary";
import { getCafes } from "@/app/actions/cafes";
import { getCoffeeGuides } from "@/app/actions/coffeeGuides";
import ConsumerPanelClient from "./ConsumerPanelClient";

export default async function ConsumerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Guard: /app/consumer solo consumer (o staff con modo consumer). owner/admin/staff sin modo → su panel.
  if (session.role === "owner" || session.role === "admin") redirect(getDashboardPath(session.role));
  if (session.role === "staff") {
    const mode = await getModeFromCookie();
    if (mode !== "consumer") redirect("/app/choose-mode");
  }

  const [data, cafesList, guidesRes] = await Promise.all([
    getConsumerSummary(),
    getCafes(),
    getCoffeeGuides(),
  ]);

  if (!data) {
    redirect("/login");
  }

  const guidesPreview = guidesRes.ok ? guidesRes.guides.slice(0, 6) : [];

  return (
    <ConsumerPanelClient
      data={data}
      cafesList={cafesList.filter((c) => c.is_active)}
      guidesPreview={guidesPreview}
    />
  );
}
