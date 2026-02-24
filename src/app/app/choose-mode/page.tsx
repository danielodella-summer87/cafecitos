import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import ChooseModeClient from "./ChooseModeClient";

export default async function ChooseModePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "staff") redirect("/app");

  return (
    <div className="min-h-screen py-12 px-4 bg-[#F6EFE6]">
      <ChooseModeClient />
    </div>
  );
}
