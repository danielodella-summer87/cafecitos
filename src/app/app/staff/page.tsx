import { getStaffContext } from "@/app/actions/ownerStaff";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import StaffPanelClient from "./StaffPanelClient";

export default async function StaffPage() {
  const session = await getSession();
  if (!session || session.role !== "staff") redirect("/login");

  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  if (!ctx.isActive) {
    return (
      <div className="min-h-screen py-6 px-4 bg-[#F6EFE6] flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium text-red-600">Usuario inactivo</p>
        <p className="text-sm text-neutral-600">Tu cuenta está inactiva. Contactá al dueño de la cafetería.</p>
        <StaffPanelClient canIssue={false} canRedeem={false} isInactive staffName={null} cafeName={null} />
      </div>
    );
  }

  return (
    <StaffPanelClient
      canIssue={ctx.canIssue}
      canRedeem={ctx.canRedeem}
      isInactive={false}
      staffName={ctx.staffName}
      cafeName={ctx.cafeName}
    />
  );
}
