export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  getAdminKpisSummary,
  getAdminCafeKpis,
  getAdminDailyKpis,
  getAdminTopClientesGlobal,
  getAdminAlerts,
  getAdminPanelClientesGlobal,
} from "@/app/actions/adminReports";
import ReportesPanelClient from "./ReportesPanelClient";

export default async function AdminReportesPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const [kpisSummary, cafesReport, daily, topClientesGlobal, alerts, panelClientesGlobal] = await Promise.all([
    getAdminKpisSummary(30),
    getAdminCafeKpis(30),
    getAdminDailyKpis(30),
    getAdminTopClientesGlobal(50),
    getAdminAlerts(20),
    getAdminPanelClientesGlobal(),
  ]);

  return (
    <ReportesPanelClient
      kpisSummary={kpisSummary}
      cafesReport={cafesReport}
      daily={daily}
      topClientesGlobal={topClientesGlobal}
      alerts={alerts}
      panelClientesGlobal={panelClientesGlobal}
    />
  );
}
