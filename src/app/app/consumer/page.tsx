import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getConsumerSummary } from "@/app/actions/consumerSummary";
import { getCafes } from "@/app/actions/cafes";
import ConsumerPanelClient from "./ConsumerPanelClient";

export default async function ConsumerPage() {
  const session = await getSession();
  if (!session || session.role !== "consumer") {
    redirect("/login");
  }

  const [data, cafesList] = await Promise.all([
    getConsumerSummary(),
    getCafes(),
  ]);

  if (!data) {
    redirect("/login");
  }

  return <ConsumerPanelClient data={data} cafesList={cafesList.filter((c) => c.is_active)} />;
}
