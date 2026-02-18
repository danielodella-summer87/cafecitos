import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getUniversoPageData } from "@/app/actions/coffeeGuides";
import UniversoCafeClient from "./UniversoCafeClient";

export default async function UniversoCafePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const safeProfileId = (session?.profileId ?? "").toString();

  const data = await getUniversoPageData(safeProfileId);
  if (!data) redirect("/app/consumer");

  return <UniversoCafeClient data={data} />;
}
