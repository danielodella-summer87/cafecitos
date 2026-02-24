"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logout } from "@/app/actions/logout";
import { ownerAddCafecitos } from "@/app/actions/owner";
import { ownerRedeemCafecitos } from "@/app/actions/ownerRedeem";
import {
  getOwnerCafe,
  getOwnerCafeKpis,
  getOwnerCafePromos,
  getOwnerCafeReviews,
  toggleOwnerPromo,
  updateCafeOwner,
  type OwnerPromoRow,
  type OwnerReviewRow,
} from "@/app/actions/ownerCafe";
import {
  getOwnerCafeEmployeeOptions,
  getOwnerCafeTransactions,
  type OwnerEmployeeOption,
  type OwnerTxRow,
} from "@/app/actions/ownerTransactions";
import { ownerGetConsumerSummary } from "@/app/actions/ownerSummary";
import { AppMark } from "@/components/brand/AppMark";
import { isValidCi } from "@/lib/ci";
import { getTxMeta } from "@/lib/ui/txLabels";
import { PRO } from "@/lib/ui/pro";
import OwnerStaffManager from "./OwnerStaffManager";

type Json = Record<string, unknown>;

type LookupState = {
  profile?: { full_name?: string | null; cedula?: string; role?: string } | null;
  balance?: number;
  earnedInThisCafe?: number;
  redeemedInThisCafe?: number;
  availableInThisCafe?: number;
  last?: Array<{ id?: string; tx_type?: string; note?: string | null; amount?: number }>;
};

type CafeForClient = {
  id: string;
  name: string;
  image_code: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  description: string | null;
  hours_text: string | null;
};

export type OwnerCapabilities = {
  isOwner: boolean;
  canIssue: boolean;
  canRedeem: boolean;
};

type Props = {
  me: { full_name: string | null; cedula: string };
  myCafe: CafeForClient | null;
  capabilities?: OwnerCapabilities;
};

function CafecitosLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <AppMark iconOnly iconSize={32} />
      {children}
    </span>
  );
}

export default function OwnerPanelClient({ me, myCafe, capabilities: caps }: Props) {
  const debugMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1";
  const capabilities: OwnerCapabilities = caps ?? { isOwner: true, canIssue: true, canRedeem: true };
  const isOwner = capabilities.isOwner;
  const canIssue = capabilities.canIssue;
  const canRedeem = capabilities.canRedeem;

  const [cedula, setCedula] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemNote, setRedeemNote] = useState("");
  const [lookup, setLookup] = useState<LookupState | null>(null);
  const [lastSummary, setLastSummary] = useState<Json | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [loadingRedeem, setLoadingRedeem] = useState(false);
  const [redeemResult, setRedeemResult] = useState<null | {
    cedula: string;
    name: string;
    redeemed: number;
    balanceAfter: number;
    availableInThisCafeAfter: number;
  }>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<{
    name: string;
    amount: number;
    remaining: number;
  } | null>(null);
  const cedulaInputRef = useRef<HTMLInputElement>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [openRedeem, setOpenRedeem] = useState(false);
  const [openLast, setOpenLast] = useState(false);
  const [lastRedeemDebug, setLastRedeemDebug] = useState<unknown>(null);
  const [lastSummaryDebug, setLastSummaryDebug] = useState<unknown>(null);
  const [openDebugPanel, setOpenDebugPanel] = useState(false);
  const [openDebugSaldoPanel, setOpenDebugSaldoPanel] = useState(false);
  const [crossCafeEnabled, setCrossCafeEnabled] = useState(true);

  const [tab, setTab] = useState<"atender" | "historial">("atender");
  const [historialDays, setHistorialDays] = useState<number | "all">(30);
  const [historialType, setHistorialType] = useState<"all" | "earn" | "redeem">("all");
  const [historialEmployeeId, setHistorialEmployeeId] = useState<string>("");
  const [historialCedula, setHistorialCedula] = useState("");
  const [historialRows, setHistorialRows] = useState<OwnerTxRow[]>([]);
  const [historialTotalCount, setHistorialTotalCount] = useState(0);
  const [historialOffset, setHistorialOffset] = useState(0);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialSummary30d, setHistorialSummary30d] = useState<{ assigned: number; redeemed: number; net: number } | null>(null);
  const [historialEmployeeOptions, setHistorialEmployeeOptions] = useState<OwnerEmployeeOption[]>([]);

  const [cafeEdit, setCafeEdit] = useState(false);
  const [cafeForm, setCafeForm] = useState<CafeForClient | null>(null);
  const [cafeSaveToast, setCafeSaveToast] = useState(false);
  const [promosList, setPromosList] = useState<OwnerPromoRow[]>([]);
  const [reviewsData, setReviewsData] = useState<{ stats: { avg_rating: number; reviews_count: number } | null; reviews: OwnerReviewRow[] }>({ stats: null, reviews: [] });
  const [kpis7, setKpis7] = useState<{ generado: number; canjeado: number; neto: number; clientes_unicos: number } | null>(null);
  const [kpis30, setKpis30] = useState<{ generado: number; canjeado: number; neto: number; clientes_unicos: number } | null>(null);
  const [gestionLoading, setGestionLoading] = useState(false);

  const amountNum = useMemo(() => parseInt(amount, 10), [amount]);
  const redeemAmountNum = useMemo(() => parseInt(redeemAmount, 10), [redeemAmount]);

  const canAssign = useMemo(() => {
    return (
      lookup?.profile &&
      lookup.profile.role === "consumer" &&
      isValidCi(cedula) &&
      !Number.isNaN(amountNum) &&
      amountNum > 0
    );
  }, [lookup, cedula, amountNum]);

  const consumer = lookup?.profile;
  const redeemFormValid = useMemo(() => {
    return (
      !!consumer &&
      consumer.role === "consumer" &&
      isValidCi(cedula) &&
      !Number.isNaN(redeemAmountNum) &&
      redeemAmountNum > 0
    );
  }, [consumer, cedula, redeemAmountNum]);

  const balanceGlobal = lookup?.balance ?? 0;
  const availableInThisCafe = lookup?.availableInThisCafe ?? 0;
  const redeemBlocked = !Number.isNaN(redeemAmountNum) && redeemAmountNum > balanceGlobal;
  const redeemErrorMsg = redeemBlocked ? "Saldo insuficiente" : null;

  async function onLookup() {
    setStatus(null);
    setLookup(null);
    setLoadingLookup(true);

    try {
      const res = await ownerGetConsumerSummary({ cedula: cedula.trim() });

      setLastSummary(res);
      if (res && typeof res === "object" && "cross_cafe_redeem" in res && typeof (res as { cross_cafe_redeem?: boolean }).cross_cafe_redeem === "boolean") {
        setCrossCafeEnabled((res as { cross_cafe_redeem: boolean }).cross_cafe_redeem);
      }
      if (res && typeof res === "object" && "debug" in res && (res as { debug?: unknown }).debug != null) {
        setLastSummaryDebug((res as { debug: unknown }).debug);
      } else {
        setLastSummaryDebug(null);
      }

      setLookup({
        profile: res.profile ?? null,
        balance: res.balance ?? 0,
        earnedInThisCafe: res.earnedInThisCafe ?? 0,
        redeemedInThisCafe: res.redeemedInThisCafe ?? 0,
        availableInThisCafe: res.availableInThisCafe ?? 0,
        last: (res.last ?? []) as LookupState["last"],
      });

      if (res?.error) setStatus(res.error ?? null);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Error buscando cliente");
    } finally {
      setLoadingLookup(false);
    }
  }

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const amountVal = parseInt(amount, 10);
    if (!amountVal || amountVal <= 0) {
      setStatus("Ingresá una cantidad válida");
      return;
    }
    setLoadingAssign(true);
    try {
      await ownerAddCafecitos({
        cedula: cedula.trim(),
        amount: amountVal,
        note: note?.trim() || "Carga manual",
      });
      setStatus("✅ Cafecitos asignados");
      setAmount("");
      await onLookup();
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Error asignando cafecitos");
    } finally {
      setLoadingAssign(false);
    }
  }

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    const amountVal = parseInt(redeemAmount, 10);
    if (!amountVal || amountVal <= 0) {
      setStatus("Ingresá una cantidad válida");
      return;
    }
    if (redeemBlocked) return;
    setStatus(null);
    setRedeemResult(null);
    setLoadingRedeem(true);
    setLastRedeemDebug(null);
    try {
      const result = await ownerRedeemCafecitos({
        cedula,
        amount: amountVal,
        note: redeemNote?.trim() || undefined,
      });
      if (result.ok) {
        setRedeemSuccess({
          name: lookup?.profile?.full_name ?? "Cliente",
          amount: amountVal,
          remaining: (lookup?.balance ?? 0) - amountVal,
        });
        setStatus("");
        setRedeemAmount("");
        setRedeemNote("");
        await onLookup();
      } else {
        setStatus(result.error);
      }
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Error canjeando cafecitos");
    } finally {
      setLoadingRedeem(false);
    }
  }

  function onFinishRedeem() {
    setRedeemResult(null);
    setCedula("");
    setLookup(null);
    setLastSummary(null);
    setStatus(null);
    setRedeemAmount("");
    setRedeemNote("Canje");
    cedulaInputRef.current?.focus();
  }

  const loadHistorial = useCallback(
    async (offsetOverride?: number) => {
      setHistorialLoading(true);
      try {
        const res = await getOwnerCafeTransactions({
          days: historialDays === "all" ? null : historialDays,
          type: historialType,
          employeeId: historialEmployeeId || undefined,
          searchCedula: historialCedula.trim() || undefined,
          limit: 25,
          offset: offsetOverride ?? historialOffset,
        });
        if (res) {
          if (offsetOverride === 0 || (offsetOverride ?? historialOffset) === 0) {
            setHistorialRows(res.rows);
            setHistorialOffset(25);
          } else {
            setHistorialRows((prev) => [...prev, ...res.rows]);
            setHistorialOffset((o) => o + 25);
          }
          setHistorialTotalCount(res.totalCount);
          if (res.summary30d) setHistorialSummary30d(res.summary30d);
        }
      } finally {
        setHistorialLoading(false);
      }
    },
    [historialDays, historialType, historialEmployeeId, historialCedula, historialOffset]
  );

  const applyHistorialFilters = useCallback(() => {
    setHistorialOffset(0);
    loadHistorial(0);
  }, [loadHistorial]);

  useEffect(() => {
    if (tab === "historial" && historialEmployeeOptions.length === 0) {
      getOwnerCafeEmployeeOptions().then((opts) => {
        if (opts) setHistorialEmployeeOptions(opts);
      });
    }
  }, [tab, historialEmployeeOptions.length]);

  useEffect(() => {
    if (tab === "historial" && historialRows.length === 0 && !historialLoading) {
      loadHistorial(0);
    }
  }, [tab]);

  useEffect(() => {
    if (myCafe && !cafeForm) setCafeForm(myCafe);
  }, [myCafe, cafeForm]);

  useEffect(() => {
    if (tab !== "atender" || !isOwner) return;
    setGestionLoading(true);
    Promise.all([
      getOwnerCafePromos(),
      getOwnerCafeReviews(),
      getOwnerCafeKpis(7),
      getOwnerCafeKpis(30),
    ])
      .then(([promos, reviews, k7, k30]) => {
        setPromosList(promos);
        setReviewsData({ stats: reviews.stats, reviews: reviews.reviews });
        setKpis7(k7 ? { generado: k7.generado, canjeado: k7.canjeado, neto: k7.neto, clientes_unicos: k7.clientes_unicos } : null);
        setKpis30(k30 ? { generado: k30.generado, canjeado: k30.canjeado, neto: k30.neto, clientes_unicos: k30.clientes_unicos } : null);
      })
      .finally(() => setGestionLoading(false));
  }, [tab, isOwner]);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("es-UY", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

  const exportHistorialXls = useCallback(() => {
    const nn = myCafe ? String(myCafe.image_code ?? "").padStart(2, "0") : "00";
    const safeName = (myCafe?.name ?? "cafe").replace(/\W+/g, "_").slice(0, 40);
    const range = historialDays === "all" ? "all" : `${historialDays}d`;
    const base = `historial_${nn}-${safeName}_${range}`;
    const filename = `${base}.xls`;

    const headers = ["Tipo", "Cantidad", "Cliente (cédula)", "Cliente (nombre)", "Staff", "Fecha/hora"];
    const escape = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const rows = historialRows.map((r) => [
      r.tx_type === "earn" ? "Asignado" : "Cobrado",
      r.tx_type === "earn" ? `+${r.amount}` : `-${r.amount}`,
      r.client_cedula ?? "",
      r.client_name ?? "",
      r.employee_name ?? "",
      formatDate(r.created_at),
    ]);
    const tableRows = [
      "<tr>" + headers.map((h) => `<th>${escape(h)}</th>`).join("") + "</tr>",
      ...rows.map((row) => "<tr>" + row.map((c) => `<td>${escape(String(c))}</td>`).join("") + "</tr>"),
    ].join("");
    const html =
      "<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\">" +
      "<head><meta charset=\"UTF-8\"/><style>table{border-collapse:collapse;} th,td{border:1px solid #333;padding:4px 8px;}</style></head>" +
      "<body><table>" +
      tableRows +
      "</table></body></html>";
    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [historialRows, myCafe, historialDays]);

  return (
    <div className={PRO.page}>
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[#0F172A]">Panel Cafetería</h1>
        <form action={logout} onSubmit={() => { if (typeof window !== "undefined") localStorage.removeItem("cafecitos.activeRoleMode"); }}>
          <button type="submit" className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-red-700 active:bg-red-800 shadow-sm">
            Salir
          </button>
        </form>
      </div>
      <p className="mt-1 text-2xl font-semibold text-red-600">
        {myCafe
          ? `${String(myCafe.image_code ?? "").padStart(2, "0")} - ${myCafe.name || "Cafetería sin nombre"}`
          : "Cafetería sin nombre"}
      </p>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 mb-4">
        <button
          type="button"
          onClick={() => setTab("atender")}
          className={`px-4 py-2 font-medium rounded-t-md transition-colors ${tab === "atender" ? "bg-red-600 text-white" : "bg-[#F6EFE6] text-neutral-700 hover:bg-neutral-200"}`}
        >
          Gestión
        </button>
        {isOwner && (
          <>
            <button
              type="button"
              onClick={() => setTab("historial")}
              className={`px-4 py-2 font-medium rounded-t-md transition-colors ${tab === "historial" ? "bg-red-600 text-white" : "bg-[#F6EFE6] text-neutral-700 hover:bg-neutral-200"}`}
            >
              Historial
            </button>
            <span className="inline-flex flex-col items-center">
              <button
                type="button"
                disabled
                className="px-4 py-2 font-medium rounded-t-md bg-neutral-200 text-neutral-500 cursor-not-allowed"
                title="Próximamente"
              >
                Carta de cafetería
              </button>
              <span className="text-xs text-neutral-500 mt-0.5">Próximamente</span>
            </span>
          </>
        )}
      </div>

      {tab === "historial" && (
        <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] p-4 space-y-4">
          {historialSummary30d != null && (
            <div className="rounded-lg border border-neutral-200 bg-white/80 p-3 text-sm">
              <span className="font-medium">Últimos 30 días:</span>{" "}
              <span className="text-green-700">Asignados {historialSummary30d.assigned}</span>
              {" | "}
              <span className="text-red-600">Cobrados {historialSummary30d.redeemed}</span>
              {" | "}
              <span className="font-semibold">Neto {historialSummary30d.net}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setHistorialDays(d);
                  setHistorialOffset(0);
                  setHistorialLoading(true);
                  getOwnerCafeTransactions({
                    days: d,
                    type: historialType,
                    employeeId: historialEmployeeId || undefined,
                    searchCedula: historialCedula.trim() || undefined,
                    limit: 25,
                    offset: 0,
                  }).then((res) => {
                    if (res) {
                      setHistorialRows(res.rows);
                      setHistorialTotalCount(res.totalCount);
                      if (res.summary30d) setHistorialSummary30d(res.summary30d);
                      setHistorialOffset(25);
                    }
                  }).finally(() => setHistorialLoading(false));
                }}
                className={`rounded-full px-3 py-1 text-sm ${historialDays === d ? "bg-red-600 text-white" : "bg-white border border-neutral-300 hover:bg-neutral-100"}`}
              >
                {d === 7 ? "7 días" : d === 30 ? "30 días" : "90 días"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setHistorialDays("all");
                setHistorialOffset(0);
                setHistorialLoading(true);
                getOwnerCafeTransactions({
                  days: null,
                  type: historialType,
                  employeeId: historialEmployeeId || undefined,
                  searchCedula: historialCedula.trim() || undefined,
                  limit: 25,
                  offset: 0,
                }).then((res) => {
                  if (res) {
                    setHistorialRows(res.rows);
                    setHistorialTotalCount(res.totalCount);
                    if (res.summary30d) setHistorialSummary30d(res.summary30d);
                    setHistorialOffset(25);
                  }
                }).finally(() => setHistorialLoading(false));
              }}
              className={`rounded-full px-3 py-1 text-sm ${historialDays === "all" ? "bg-red-600 text-white" : "bg-white border border-neutral-300 hover:bg-neutral-100"}`}
            >
              Todos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={historialType}
                onChange={(e) => setHistorialType(e.target.value as "all" | "earn" | "redeem")}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="all">Todos</option>
                <option value="earn">Asignados</option>
                <option value="redeem">Cobrados</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Staff</label>
              <select
                value={historialEmployeeId}
                onChange={(e) => setHistorialEmployeeId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Todos</option>
                {historialEmployeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name ?? emp.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cédula cliente</label>
              <input
                type="text"
                value={historialCedula}
                onChange={(e) => setHistorialCedula(e.target.value)}
                placeholder="Buscar por cédula"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex flex-wrap items-end gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={applyHistorialFilters}
                disabled={historialLoading}
                className="w-full sm:w-auto min-w-0 rounded-lg px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {historialLoading ? "Cargando…" : "Buscar"}
              </button>
              {historialRows.length > 0 && (
                <button
                  type="button"
                  onClick={exportHistorialXls}
                  className="w-full sm:w-auto min-w-0 rounded-lg px-4 py-2 border border-red-600 text-red-600 font-medium hover:bg-red-50"
                >
                  Exportar XLS
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full hidden md:table text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="p-2 font-medium">Tipo</th>
                  <th className="p-2 font-medium">Cantidad</th>
                  <th className="p-2 font-medium">Cliente</th>
                  <th className="p-2 font-medium">Staff</th>
                  <th className="p-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {historialRows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-200">
                    <td className="p-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${r.tx_type === "earn" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {r.tx_type === "earn" ? "Asignado" : "Cobrado"}
                      </span>
                    </td>
                    <td className={`p-2 font-semibold ${r.tx_type === "earn" ? "text-green-700" : "text-red-700"}`}>
                      {r.tx_type === "earn" ? "+" : "-"}
                      {r.amount}
                    </td>
                    <td className="p-2">
                      {[r.client_cedula, r.client_name].filter(Boolean).join(" — ") || "—"}
                    </td>
                    <td className="p-2">{r.employee_name ?? "—"}</td>
                    <td className="p-2 text-neutral-600">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="md:hidden space-y-2">
              {historialRows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${r.tx_type === "earn" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {r.tx_type === "earn" ? "Asignado" : "Cobrado"}
                    </span>
                    <span className={`font-semibold ${r.tx_type === "earn" ? "text-green-700" : "text-red-700"}`}>
                      {r.tx_type === "earn" ? "+" : "-"}
                      {r.amount}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-neutral-500">Cliente:</span> {[r.client_cedula, r.client_name].filter(Boolean).join(" — ") || "—"}
                  </div>
                  <div className="text-sm">
                    <span className="text-neutral-500">Staff:</span> {r.employee_name ?? "—"}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">{formatDate(r.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
          {historialRows.length === 0 && !historialLoading && (
            <p className="text-center text-neutral-500 py-6">No hay movimientos con los filtros elegidos.</p>
          )}
          {historialRows.length < historialTotalCount && historialRows.length > 0 && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => loadHistorial()}
                disabled={historialLoading}
                className="rounded-lg px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {historialLoading ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "atender" && (
      <div className="space-y-6">
        {isOwner && (
        <>
        {/* A) Ficha de la cafetería */}
        <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] overflow-hidden">
          <div className="relative h-32 sm:h-40 bg-neutral-200">
            <img
              src={myCafe?.image_code ? `/media/cafes/${String(myCafe.image_code).padStart(2, "0")}.jpg` : "/media/cover-default.jpg"}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-4 space-y-3">
            {cafeSaveToast && (
              <p className="text-sm text-green-700 font-medium">Guardado.</p>
            )}
            {!cafeEdit && cafeForm && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {(cafeForm.city || cafeForm.address) && (
                    <div>
                      <span className="text-neutral-500">Ubicación:</span>{" "}
                      {[cafeForm.city, cafeForm.address].filter(Boolean).join(", ") || "—"}
                    </div>
                  )}
                  {cafeForm.phone && <div><span className="text-neutral-500">Teléfono:</span> {cafeForm.phone}</div>}
                  {cafeForm.email && <div><span className="text-neutral-500">Email:</span> {cafeForm.email}</div>}
                  {cafeForm.instagram && <div><span className="text-neutral-500">Instagram:</span> {cafeForm.instagram}</div>}
                  {cafeForm.description && <div className="sm:col-span-2"><span className="text-neutral-500">Descripción:</span> {cafeForm.description}</div>}
                  {cafeForm.hours_text && <div className="sm:col-span-2"><span className="text-neutral-500">Horario:</span> {cafeForm.hours_text}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(cafeForm.address || cafeForm.city) && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([cafeForm.address, cafeForm.city].filter(Boolean).join(", "))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg px-3 py-2 text-sm border border-red-600 text-red-600 hover:bg-red-50"
                    >
                      Ver en mapa
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setCafeEdit(true)}
                    className="rounded-lg px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700"
                  >
                    Editar
                  </button>
                </div>
              </>
            )}
            {cafeEdit && cafeForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await updateCafeOwner({
                    name: cafeForm.name,
                    city: cafeForm.city ?? undefined,
                    address: cafeForm.address ?? undefined,
                    phone: cafeForm.phone ?? undefined,
                    email: cafeForm.email ?? undefined,
                    instagram: cafeForm.instagram ?? undefined,
                    description: cafeForm.description ?? undefined,
                    hours_text: cafeForm.hours_text ?? undefined,
                  });
                  if (res.ok) {
                    const updated = await getOwnerCafe();
                    if (updated) setCafeForm({ ...cafeForm, ...updated });
                    setCafeEdit(false);
                    setCafeSaveToast(true);
                    setTimeout(() => setCafeSaveToast(false), 3000);
                  } else {
                    setStatus(res.error ?? "Error al guardar");
                  }
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Nombre (mín. 5 caracteres)</label>
                    <input className="w-full border rounded-lg px-3 py-2" value={cafeForm.name} onChange={(e) => setCafeForm({ ...cafeForm, name: e.target.value })} required minLength={5} />
                  </div>
                  <div><label className="block text-sm font-medium mb-1">Ciudad</label><input className="w-full border rounded-lg px-3 py-2" value={cafeForm.city ?? ""} onChange={(e) => setCafeForm({ ...cafeForm, city: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">Dirección</label><input className="w-full border rounded-lg px-3 py-2" value={cafeForm.address ?? ""} onChange={(e) => setCafeForm({ ...cafeForm, address: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">Teléfono</label><input className="w-full border rounded-lg px-3 py-2" value={cafeForm.phone ?? ""} onChange={(e) => setCafeForm({ ...cafeForm, phone: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full border rounded-lg px-3 py-2" value={cafeForm.email ?? ""} onChange={(e) => setCafeForm({ ...cafeForm, email: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">Instagram</label><input className="w-full border rounded-lg px-3 py-2" value={cafeForm.instagram ?? ""} onChange={(e) => setCafeForm({ ...cafeForm, instagram: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Descripción</label><textarea className="w-full border rounded-lg px-3 py-2" rows={2} value={cafeForm.description ?? ""} onChange={(e) => setCafeForm({ ...cafeForm, description: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Horario (máx. 120 caracteres)</label><textarea className="w-full border rounded-lg px-3 py-2" rows={2} maxLength={120} placeholder="Lun-Vie 8–19 / Sáb 9–14" value={cafeForm.hours_text ?? ""} onChange={(e) => setCafeForm({ ...cafeForm, hours_text: e.target.value })} /></div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="rounded-lg px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700">Guardar</button>
                  <button type="button" onClick={async () => { const u = await getOwnerCafe(); if (u) setCafeForm({ ...cafeForm, ...u }); setCafeEdit(false); }} className="rounded-lg px-4 py-2 border border-neutral-300 hover:bg-neutral-100">Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* F) KPIs rápidos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis7 && (
            <>
              <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] p-3">
                <div className="text-xs text-neutral-500">7 días · Asignados</div>
                <div className="text-xl font-semibold text-green-700">{kpis7.generado}</div>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] p-3">
                <div className="text-xs text-neutral-500">7 días · Cobrados</div>
                <div className="text-xl font-semibold text-red-600">{kpis7.canjeado}</div>
              </div>
            </>
          )}
          {kpis30 && (
            <>
              <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] p-3">
                <div className="text-xs text-neutral-500">30 días · Neto</div>
                <div className="text-xl font-semibold">{kpis30.neto}</div>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] p-3">
                <div className="text-xs text-neutral-500">30 días · Clientes únicos</div>
                <div className="text-xl font-semibold">{kpis30.clientes_unicos}</div>
              </div>
            </>
          )}
        </div>
        {(kpis7 || kpis30) && (
          <div>
            <button type="button" onClick={() => setTab("historial")} className="rounded-lg px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700">Ver detalles (Historial)</button>
          </div>
        )}
        </>
        )}

        {/* Atender cliente */}
      <div className="border rounded-xl p-4 space-y-3 bg-[#F6EFE6]">
        <h2 className="text-lg font-semibold">Atender cliente</h2>
        <label className="block text-sm font-medium">Cédula del cliente</label>
        <input
          ref={cedulaInputRef}
          value={cedula}
          onChange={(e) => {
            const onlyNumbers = e.target.value.replace(/\D/g, "");
            setCedula(onlyNumbers.slice(0, 8));
          }}
          placeholder="Ingresá cédula (8 dígitos)"
          inputMode="numeric"
          maxLength={8}
          pattern="[0-9]*"
          autoComplete="off"
          className="w-full border rounded px-3 py-2"
        />
        {cedula.length > 0 && !isValidCi(cedula) && (
          <p className="text-xs text-amber-600">La cédula debe tener exactamente 8 dígitos.</p>
        )}

        <button
          type="button"
          onClick={async () => {
            if (!isValidCi(cedula)) {
              setStatus("Ingresá los 8 dígitos de la cédula.");
              return;
            }
            setStatus("Buscando...");

            try {
              setLoadingLookup(true);
              const res = await ownerGetConsumerSummary({ cedula: cedula.trim() });
              const r = res as Json;
              if (r && typeof r === "object" && "debug" in r && (r as { debug?: unknown }).debug != null) {
                setLastSummaryDebug((r as { debug: unknown }).debug);
              } else {
                setLastSummaryDebug(null);
              }
              setLookup({
                profile: r.profile as LookupState["profile"],
                balance: r.balance as number | undefined,
                earnedInThisCafe: r.earnedInThisCafe as number | undefined,
                redeemedInThisCafe: r.redeemedInThisCafe as number | undefined,
                availableInThisCafe: r.availableInThisCafe as number | undefined,
                last: r.last as LookupState["last"],
              });

              if (typeof r === "object" && r !== null && "cross_cafe_redeem" in r && typeof (r as { cross_cafe_redeem?: boolean }).cross_cafe_redeem === "boolean") {
                setCrossCafeEnabled((r as { cross_cafe_redeem: boolean }).cross_cafe_redeem);
              }
              if (r?.error) setStatus(String(r.error));
              else setStatus("✅ Cliente cargado");
            } catch (e: unknown) {
              setStatus(e instanceof Error ? e.message : "Error buscando cliente");
            } finally {
              setLoadingLookup(false);
            }
          }}
          className="mt-2 w-full rounded-xl bg-red-600 text-white py-2 font-semibold hover:bg-red-700 active:bg-red-800 disabled:opacity-50"
          disabled={!isValidCi(cedula) || loadingLookup}
        >
          {loadingLookup ? "Buscando…" : "Buscar"}
        </button>

        {status ? (
          <p className="mt-2 text-sm text-red-600">
            {crossCafeEnabled && status.includes("en esta cafetería") ? "Saldo insuficiente" : status}
          </p>
        ) : null}

        {redeemSuccess && (
          <div className="border rounded-lg p-6 bg-green-50 mb-4">
            <h3 className="text-lg font-semibold mb-2">
              ✅ Canje realizado
            </h3>

            <p>
              Se descontaron <b>{redeemSuccess.amount}</b> cafecitos a{" "}
              <b>{redeemSuccess.name}</b>.
            </p>

            <p className="mt-1">
              Saldo restante: <b>{redeemSuccess.remaining}</b> cafecitos
            </p>

            <button
              type="button"
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              onClick={() => {
                setRedeemSuccess(null);
                setLookup(null);
                setCedula("");
                setStatus("");
                cedulaInputRef.current?.focus();
              }}
            >
              Finalizar y cargar nueva cédula
            </button>
          </div>
        )}

        {lookup?.profile && !redeemSuccess && (
          <div className="border rounded-lg p-3 text-sm space-y-2">
            {/* Card rápida: nombre + cédula + saldo global + disponible en mi cafetería + canjeado en mi cafetería */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/80 backdrop-blur p-4 text-white shadow-sm">
              <div className="text-base font-semibold">
                {lookup.profile.full_name ?? "(sin nombre)"}
              </div>

              <div className="text-sm text-white/70 mt-1">
                Cédula: {lookup.profile.cedula} · Rol: {lookup.profile.role}
              </div>

              {"phone" in lookup.profile && (lookup.profile as { phone?: string | null }).phone && (
                <div className="text-sm text-white/70">
                  Teléfono: {(lookup.profile as { phone?: string | null }).phone}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-xs text-white/60">{crossCafeEnabled ? "Saldo total" : "Saldo actual"}</div>
                  <div className="text-2xl font-semibold text-white">
                    {lookup?.balance ?? 0}
                  </div>
                </div>

                {crossCafeEnabled ? (
                  <div>
                    <div className="text-xs text-white/60">Generados en mi cafetería</div>
                    <div className="text-2xl font-semibold text-white">
                      {lookup?.earnedInThisCafe ?? 0}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-white/60">Disponible en esta cafetería</div>
                    <div className="text-2xl font-semibold text-white">
                      {lookup?.availableInThisCafe ?? 0}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-white/60">Canjeado en mi cafetería</div>
                  <div className="text-2xl font-semibold text-white">
                    {lookup?.redeemedInThisCafe ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {debugMode && (
              <div className="mt-4 rounded-xl border border-neutral-300 bg-neutral-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenDebugSaldoPanel((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-neutral-800"
                >
                  <span>DEBUG Saldo (temporal)</span>
                  <span>{openDebugSaldoPanel ? "▾" : "▸"}</span>
                </button>
                {openDebugSaldoPanel && (
                  <div className="p-3 border-t border-neutral-300 bg-white text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto space-y-2">
                    <p><b>crossCafeEnabled:</b> {String(crossCafeEnabled)}</p>
                    {lastSummaryDebug ? (
                      <>
                        {(() => {
                          const d = lastSummaryDebug as Record<string, unknown>;
                          const shown = d.shown as Record<string, unknown> | undefined;
                          const sources = d.sources as Record<string, unknown> | undefined;
                          const diff = d.diff as Record<string, unknown> | undefined;
                          const global = sources?.fromTransactionsGlobal as Record<string, unknown> | undefined;
                          const cafe = sources?.fromTransactionsThisCafe as Record<string, unknown> | undefined;
                          return (
                            <>
                              {shown && (
                                <p><b>shown:</b> currentBalance={String(shown.currentBalance)} generatedInCafe={String(shown.generatedInCafe)} redeemedInCafe={String(shown.redeemedInCafe)}</p>
                              )}
                              {global && (
                                <p><b>sources.fromTransactionsGlobal:</b> balance={String(global.balance)} txCount={String(global.txCount)} nullCafeIdCount={String(global.nullCafeIdCount)}</p>
                              )}
                              {cafe && (
                                <p><b>sources.fromTransactionsThisCafe:</b> balance={String(cafe.balance)} txCount={String(cafe.txCount)} nullCafeIdCount={String(cafe.nullCafeIdCount)}</p>
                              )}
                              {sources?.fromProfileColumn && (
                                <p><b>sources.fromProfileColumn:</b> {JSON.stringify(sources.fromProfileColumn)}</p>
                              )}
                              {diff && (
                                <p><b>diff:</b> shownMinusGlobalTxBalance={String(diff.shownMinusGlobalTxBalance)} shownMinusCafeTxBalance={String(diff.shownMinusCafeTxBalance)}</p>
                              )}
                              {global?.last5 && (
                                <div><b>global.last5:</b><pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(global.last5, null, 2)}</pre></div>
                              )}
                              {cafe?.last5 && (
                                <div><b>cafe.last5:</b><pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(cafe.last5, null, 2)}</pre></div>
                              )}
                              {shown && global && (Number(shown.currentBalance) !== Number(global.balance)) && (
                                <div className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900 mt-2">
                                  El saldo mostrado NO viene de point_transactions global. Hay otra fuente (columna balance o summary/cache).
                                </div>
                              )}
                              {global && Number(global.nullCafeIdCount) > 0 && (
                                <div className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900 mt-2">
                                  Hay tx con cafe_id NULL. Si el sistema antes sumaba global sin cafe_id, el saldo por cafetería dará 0.
                                </div>
                              )}
                            </>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(lastSummaryDebug, null, 2))}
                          className="mt-2 rounded px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800"
                        >
                          Copiar debug saldo
                        </button>
                      </>
                    ) : (
                      <p className="text-neutral-500">Buscá un cliente para ver el debug de saldo aquí.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ---- Últimos movimientos (solo MI cafetería) ---- */}
            <div className="border rounded-lg bg-white overflow-hidden mt-4">
              <button
                type="button"
                onClick={() => setOpenLast((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 font-medium hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <AppMark iconOnly iconSize={18} />
                  Últimos movimientos
                </span>
                <span className="text-sm opacity-60">{openLast ? "−" : "+"}</span>
              </button>

              {openLast && (
                <div className="px-4 pb-4">
                  {(lookup?.last ?? []).length ? (
                    <div className="space-y-2 mt-2">
                      {(lookup?.last ?? []).map((t: { id?: string; tx_type?: string; note?: string | null; amount?: number }) => {
                        const meta = getTxMeta((t.tx_type ?? "earn") as Parameters<typeof getTxMeta>[0]);
                        const isMinus = t.tx_type === "redeem" || t.tx_type === "transfer_out";

                        return (
                          <div
                            key={t.id}
                            className="flex justify-between text-sm border-b pb-2"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 font-medium">
                                {meta.icon === "logo" ? <AppMark iconOnly iconSize={28} /> : meta.icon}{" "}
                                {meta.label}
                              </div>
                              <div className="opacity-60">
                                {t.note ?? ""}
                              </div>
                            </div>

                            <div
                              className={
                                isMinus
                                  ? "text-orange-600 font-semibold"
                                  : "text-green-600 font-semibold"
                              }
                            >
                              {isMinus ? "-" : "+"}{t.amount ?? 0}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm opacity-60 mt-2">
                      Sin movimientos recientes
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {debugMode && lastSummary && (
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #ccc", borderRadius: 8, background: "#fafafa" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>DEBUG</div>
            <pre style={{ fontSize: 12, overflow: "auto" }}>{JSON.stringify(lastSummary, null, 2)}</pre>
          </div>
        )}

        {canIssue && (
        <>
        {/* Sumar cafecitos */}
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <button
            type="button"
            onClick={() => setOpenAdd((v) => !v)}
            className="w-full flex items-center justify-between text-left font-semibold text-lg"
          >
            <span className="inline-flex items-center gap-2">
              <AppMark iconOnly iconSize={18} />
              Sumar cafecitos
            </span>
            <span>{openAdd ? "▾" : "▸"}</span>
          </button>
          {openAdd && (
            <>
              <p className="text-sm text-neutral-500">Cargar cafecitos al cliente (earn).</p>
              <form onSubmit={onAssign} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm block mb-1">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="Cantidad"
                      className="w-full border rounded-lg px-3 py-2"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm block mb-1">Nota</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Carga manual / promo / compensación…"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!canAssign || loadingAssign}
                  className="w-full rounded-lg px-3 py-2 border"
                >
                  {loadingAssign ? "Asignando..." : <CafecitosLabel>Asignar cafecitos</CafecitosLabel>}
                </button>
              </form>
            </>
          )}
        </section>
        </>
        )}

        {canRedeem && (
        <>
        {/* Separador */}
        <div className="border-t border-neutral-200" />

        {/* Usar cafecitos / Post-canje success panel */}
        {redeemResult !== null ? (
          <section className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-4">
            <h2 className="text-lg font-semibold text-green-800">Canje procesado</h2>
            <p className="text-sm text-neutral-700">Cliente: {redeemResult.name} (CI {redeemResult.cedula})</p>
            <p className="text-sm text-neutral-700">Se canjearon: <strong>{redeemResult.redeemed}</strong></p>
            <p className="text-2xl font-semibold text-neutral-900">Saldo total restante: {redeemResult.balanceAfter}</p>
            {!crossCafeEnabled && (
              <p className="text-sm text-neutral-700">Disponible en esta cafetería: {redeemResult.availableInThisCafeAfter}</p>
            )}
            <button
              type="button"
              onClick={onFinishRedeem}
              className="w-full rounded-lg px-3 py-2 bg-black text-white font-medium hover:bg-neutral-800"
            >
              Finalizar y cargar nueva cédula
            </button>
          </section>
        ) : (
          <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3 mt-6">
            <button
              type="button"
              onClick={() => setOpenRedeem((v) => !v)}
              className="w-full flex items-center justify-between text-left font-semibold text-lg"
            >
              <span className="inline-flex items-center gap-2">
              <AppMark iconOnly iconSize={18} />
              Canjear cafecitos
            </span>
              <span>{openRedeem ? "▾" : "▸"}</span>
            </button>
            {openRedeem && (
              <>
                <p className="text-sm text-neutral-500">Descontar cafecitos cuando el cliente los usa (redeem).</p>
                <form onSubmit={onRedeem} className="space-y-3">
                  {consumer && redeemErrorMsg && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                      {crossCafeEnabled && redeemErrorMsg.includes("en esta cafetería") ? "Saldo insuficiente" : redeemErrorMsg}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm block mb-1">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        placeholder="Cantidad"
                        className="w-full border rounded-lg px-3 py-2"
                        value={redeemAmount}
                        onChange={(e) => setRedeemAmount(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm block mb-1">Nota (opcional)</label>
                      <input
                        className="w-full border rounded-lg px-3 py-2"
                        value={redeemNote}
                        onChange={(e) => setRedeemNote(e.target.value)}
                        placeholder="Canje"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!consumer || !redeemFormValid || loadingRedeem || redeemBlocked}
                    className="w-full rounded-lg px-3 py-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingRedeem ? "Canjeando..." : "Canjear"}
                  </button>
                  {crossCafeEnabled && (
                    <p className="text-sm text-neutral-500 mt-1">
                      Canje cruzado activo: el saldo es global (podés canjear en cualquier cafetería).
                    </p>
                  )}
                </form>

                {debugMode && (
                  <div className="mt-4 rounded-xl border border-neutral-300 bg-neutral-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenDebugPanel((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-neutral-800"
                    >
                      <span>DEBUG Canje (temporal)</span>
                      <span>{openDebugPanel ? "▾" : "▸"}</span>
                    </button>
                    {openDebugPanel && (
                      <div className="p-3 border-t border-neutral-300 bg-white text-xs font-mono overflow-x-auto max-h-80 overflow-y-auto space-y-2">
                        <p><b>crossCafeEnabled:</b> {String(crossCafeEnabled)}</p>
                        {lastRedeemDebug ? (
                          <>
                            {(() => {
                              const d = lastRedeemDebug as Record<string, unknown>;
                              return (
                                <>
                                  <p><b>consumerId:</b> {String(d.consumerId ?? "—")}</p>
                                  <p><b>cafeId:</b> {String(d.cafeId ?? "—")}</p>
                                  <p><b>usedBalance:</b> {String(d.usedBalance ?? "—")} · <b>requestedAmount:</b> {String(d.requestedAmount ?? "—")}</p>
                                  {(d.cafeMeta as Record<string, unknown>) && (
                                    <p><b>cafeMeta:</b> txCount={(d.cafeMeta as Record<string, unknown>).txCount} nullCafeIdCount={(d.cafeMeta as Record<string, unknown>).nullCafeIdCount}</p>
                                  )}
                                  {(d.globalMeta as Record<string, unknown>) && (
                                    <p><b>globalMeta:</b> txCount={(d.globalMeta as Record<string, unknown>).txCount} nullCafeIdCount={(d.globalMeta as Record<string, unknown>).nullCafeIdCount}</p>
                                  )}
                                  {(d.cafeMeta as Record<string, unknown>)?.typesCount && (
                                    <p><b>cafeMeta.typesCount:</b> {JSON.stringify((d.cafeMeta as Record<string, unknown>).typesCount)}</p>
                                  )}
                                  {(d.globalMeta as Record<string, unknown>)?.typesCount && (
                                    <p><b>globalMeta.typesCount:</b> {JSON.stringify((d.globalMeta as Record<string, unknown>).typesCount)}</p>
                                  )}
                                  {(d.cafeMeta as Record<string, unknown>)?.last5 && (
                                    <div><b>cafeMeta.last5:</b>
                                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify((d.cafeMeta as Record<string, unknown>).last5, null, 2)}</pre>
                                    </div>
                                  )}
                                  {(d.globalMeta as Record<string, unknown>)?.last5 && (
                                    <div><b>globalMeta.last5:</b>
                                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify((d.globalMeta as Record<string, unknown>).last5, null, 2)}</pre>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(lastRedeemDebug, null, 2));
                              }}
                              className="mt-2 rounded px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800"
                            >
                              Copiar debug canje
                            </button>
                          </>
                        ) : (
                          <p className="text-neutral-500">Canjeá una vez para ver el debug aquí.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}
        </>
        )}

        {consumer && status && <div className="text-sm">{status}</div>}
      </div>

        {isOwner && (
        <>
        {/* C) Personal (solo dueño) */}
        <OwnerStaffManager />

        {/* D) Promociones */}
        <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] p-4">
          <h2 className="text-lg font-semibold mb-3">Promociones</h2>
          {gestionLoading ? (
            <p className="text-sm text-neutral-500">Cargando…</p>
          ) : promosList.length === 0 ? (
            <p className="text-sm text-neutral-500">No hay promociones cargadas.</p>
          ) : (
            <ul className="space-y-2">
              {promosList.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-2 text-sm">
                  <div>
                    <span className="font-medium">{p.title}</span>
                    {p.description && <span className="text-neutral-500 ml-2">— {p.description.slice(0, 60)}{p.description.length > 60 ? "…" : ""}</span>}
                  </div>
                  <span className="text-xs">{p.is_active ? "Participa: Sí" : "Participa: No"}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await toggleOwnerPromo(p.id, !p.is_active);
                      if (res.ok) setPromosList(await getOwnerCafePromos());
                      else setStatus(res.error ?? null);
                    }}
                    className="rounded-lg px-3 py-1 text-sm bg-red-600 text-white"
                  >
                    {p.is_active ? "Quitarme" : "Sumarme"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* E) Reseñas (solo lectura) */}
        <div className="rounded-xl border border-neutral-200 bg-[#F6EFE6] p-4">
          <h2 className="text-lg font-semibold mb-3">Reseñas</h2>
          {reviewsData.stats && (
            <p className="text-sm mb-2">Valoración promedio: <strong>{reviewsData.stats.avg_rating}</strong> · Cantidad: <strong>{reviewsData.stats.reviews_count}</strong></p>
          )}
          {reviewsData.reviews.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin reseñas aún.</p>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {reviewsData.reviews.slice(0, 15).map((r) => (
                <li key={r.id} className="rounded-lg border border-neutral-200 bg-white p-2 text-sm">
                  <span className="font-medium">{r.rating} ★</span>
                  {r.comment && <span className="ml-2">{r.comment}</span>}
                  <div className="text-xs text-neutral-500 mt-1">{r.author_name || r.author_cedula || "Anónimo"} · {new Date(r.created_at).toLocaleDateString("es-UY")}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </>
        )}
      </div>
      )}
    </div>
  </div>
  );
}
