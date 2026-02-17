export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  getAdminKpisSummary,
  getAdminCafeKpis30d,
  getAdminDailyKpis,
  getAdminTopClientesGlobal,
  getAdminAlerts,
  getAdminPanelClientesGlobal,
} from "@/app/actions/adminReports";
import type { KpisSummaryRow } from "@/app/actions/adminReports";
import ReportesPanelClient from "./ReportesPanelClient";

const defaultKpisSummary: KpisSummaryRow = {
  movimientos_30d: 0,
  earn_30d: 0,
  redeem_30d: 0,
  generado_30d: 0,
  canjeado_30d: 0,
  neto_30d: 0,
  cafes_activas_30d: 0,
  clientes_activos_30d: 0,
};

export default async function AdminReportesPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  let kpisSummary: KpisSummaryRow = defaultKpisSummary;
  let cafesReport: Awaited<ReturnType<typeof getAdminCafeKpis30d>> = [];
  let daily: Awaited<ReturnType<typeof getAdminDailyKpis>> = [];
  let topClientesGlobal: Awaited<ReturnType<typeof getAdminTopClientesGlobal>> = [];
  let alerts: Awaited<ReturnType<typeof getAdminAlerts>> = [];
  let panelClientesGlobal: Awaited<ReturnType<typeof getAdminPanelClientesGlobal>> = [];
  let reportesLoadError: string | null = null;

  try {
    const [k, c, d, t, a, p] = await Promise.all([
      getAdminKpisSummary(30),
      getAdminCafeKpis30d(),
      getAdminDailyKpis(30),
      getAdminTopClientesGlobal(50),
      getAdminAlerts(20),
      getAdminPanelClientesGlobal(),
    ]);
    kpisSummary = k;
    cafesReport = c;
    daily = d;
    topClientesGlobal = t;
    alerts = a;
    panelClientesGlobal = p;
  } catch (e) {
    const err = e as Error;
    console.error("REPORTES load error", e);
    reportesLoadError = String(err?.message ?? err);
  }

  return (
    <ReportesPanelClient
      kpisSummary={kpisSummary}
      cafesReport={cafesReport}
      daily={daily}
      topClientesGlobal={topClientesGlobal}
      alerts={alerts}
      panelClientesGlobal={panelClientesGlobal}
      reportesLoadError={reportesLoadError}
    />
  );
}
