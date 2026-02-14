import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "owner") redirect("/app/owner");
  if (session.role === "consumer") redirect("/app/consumer");

  redirect("/login");
}
