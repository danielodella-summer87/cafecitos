import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getConsumerSummary } from "@/app/actions/consumerSummary";
import ConsumerPanelClient from "./ConsumerPanelClient";

export default async function ConsumerPage() {
  const session = await getSession();
  if (!session || session.role !== "consumer") {
    redirect("/login");
  }

  const data = await getConsumerSummary();
  if (!data) {
    redirect("/login");
  }

  return <ConsumerPanelClient data={data} />;
}
