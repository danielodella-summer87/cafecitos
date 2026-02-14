import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AdminPanelClient from "./AdminPanelClient";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/login");

  return <AdminPanelClient />;
}
