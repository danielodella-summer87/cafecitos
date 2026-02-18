import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "owner") redirect("/app/owner");
  if (session.role !== "staff" || !session.staffId) redirect("/login");
  return <>{children}</>;
}
