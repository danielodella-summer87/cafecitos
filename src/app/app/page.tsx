import { getSession } from "@/lib/auth/session";
import { getDashboardPath } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "staff") redirect("/app/choose-mode");
  redirect(getDashboardPath(session.role));
}
