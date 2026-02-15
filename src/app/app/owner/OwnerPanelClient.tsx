"use client";

import { useMemo, useRef, useState } from "react";
import { logout } from "@/app/actions/logout";
import { ownerAddCafecitos } from "@/app/actions/owner";
import { ownerRedeemCafecitos } from "@/app/actions/ownerRedeem";
import { ownerGetConsumerSummary } from "@/app/actions/ownerSummary";
import { getTxMeta } from "@/lib/ui/txLabels";

type Props = {
  me: { full_name: string | null; cedula: string };
  myCafe: { name: string } | null;
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-UY");
}

function CafecitosLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span role="img" aria-label="cafe">☕</span>
      {children}
    </span>
  );
}

const debug =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") === "1";

export default function OwnerPanelClient({ me, myCafe }: Props) {
  const [cedula, setCedula] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [note, setNote] = useState("");
  const [redeemAmount, setRedeemAmount] = useState<number>(1);
  const [redeemNote, setRedeemNote] = useState("");
  const [lookup, setLookup] = useState<any>(null);
  const [lastSummary, setLastSummary] = useState<any>(null);
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

  const canAssign = useMemo(() => {
    return (
      lookup?.profile &&
      lookup.profile.role === "consumer" &&
      cedula.trim().length >= 6 &&
      Number.isFinite(amount) &&
      amount > 0
    );
  }, [lookup, cedula, amount]);

  const consumer = lookup?.profile;
  const canRedeem = useMemo(() => {
    return (
      !!consumer &&
      consumer.role === "consumer" &&
      cedula.trim().length >= 6 &&
      Number.isFinite(redeemAmount) &&
      redeemAmount > 0
    );
  }, [consumer, cedula, redeemAmount]);

  const balanceGlobal = lookup?.balance ?? 0;
  const availableInThisCafe = lookup?.availableInThisCafe ?? 0;
  const redeemErrorGlobal = redeemAmount > balanceGlobal;
  const redeemErrorInCafe = redeemAmount > availableInThisCafe;
  const redeemBlocked = redeemErrorGlobal || redeemErrorInCafe;
  const redeemErrorMsg = redeemErrorGlobal
    ? "Saldo insuficiente (global)"
    : redeemErrorInCafe
      ? "Saldo insuficiente en esta cafetería"
      : null;

  async function onLookup() {
    setStatus(null);
    setLookup(null);
    setLoadingLookup(true);

    try {
      const res = await ownerGetConsumerSummary({ cedula: cedula.trim() });

      setLastSummary(res);

      setLookup({
        profile: res.profile,
        balance: res.balance ?? 0,
        earnedInThisCafe: res.earnedInThisCafe ?? 0,
        redeemedInThisCafe: res.redeemedInThisCafe ?? 0,
        availableInThisCafe: res.availableInThisCafe ?? 0,
        last: res.last ?? [],
      });

      if (res?.error) setStatus(res.error);
    } catch (e: any) {
      setStatus(e?.message ?? "Error buscando cliente");
    } finally {
      setLoadingLookup(false);
    }
  }

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoadingAssign(true);
    try {
      await ownerAddCafecitos({
        cedula: cedula.trim(),
        amount: Number(amount),
        note: note?.trim() || "Carga manual",
      });
      setStatus("✅ Cafecitos asignados");
      await onLookup();
    } catch (e: any) {
      setStatus(e?.message ?? "Error asignando cafecitos");
    } finally {
      setLoadingAssign(false);
    }
  }

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (redeemBlocked) return;
    setStatus(null);
    setRedeemResult(null);
    setLoadingRedeem(true);
    try {
      const result = await ownerRedeemCafecitos({
        cedula: cedula.trim(),
        amount: Number(redeemAmount),
        note: redeemNote?.trim() || undefined,
      });
      if (result.ok) {
        setRedeemSuccess({
          name: lookup?.profile?.full_name ?? "Cliente",
          amount: redeemAmount,
          remaining: (lookup?.balance ?? 0) - redeemAmount,
        });
        setStatus("");
        setRedeemAmount(1);
        setRedeemNote("");
        await onLookup();
      } else {
        setStatus(result.error);
      }
    } catch (e: any) {
      setStatus(e?.message ?? "Error canjeando cafecitos");
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
    setRedeemAmount(1);
    setRedeemNote("Canje");
    cedulaInputRef.current?.focus();
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Panel de la cafetería</h1>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm px-3 py-1 border rounded-md hover:bg-gray-100"
          >
            Salir
          </button>
        </form>
      </div>
      <p className="mt-2 text-3xl font-semibold text-red-500">
        {me.full_name || me.cedula} · ☕ {myCafe?.name || "Cafetería sin nombre"}
      </p>

      <div className="border rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium">Cédula del cliente</label>
        <input
          ref={cedulaInputRef}
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          placeholder="Ej: 40031685"
          className="w-full border rounded px-3 py-2"
        />

        <button
          type="button"
          onClick={async () => {
            setStatus("Buscando...");

            try {
              setLoadingLookup(true);
              const clean = String(cedula ?? "").trim().replace(/\D/g, "");
              if (clean.length < 6) {
                setStatus("Ingresá una cédula válida");
                return;
              }

              const res = await ownerGetConsumerSummary({ cedula: clean });
              setLookup(res as any);

              if ((res as any)?.error) setStatus((res as any).error);
              else setStatus("✅ Cliente cargado");
            } catch (e: any) {
              setStatus(e?.message ?? "Error buscando cliente");
            } finally {
              setLoadingLookup(false);
            }
          }}
          className="mt-2 w-full rounded bg-black text-white py-2 disabled:opacity-50"
          disabled={loadingLookup}
        >
          {loadingLookup ? "Buscando..." : "Buscar"}
        </button>

        {status ? <p className="mt-2 text-sm text-red-600">{status}</p> : null}

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
              className="mt-4 px-4 py-2 bg-black text-white rounded"
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
                  <div className="text-xs text-white/60">Saldo actual</div>
                  <div className="text-2xl font-semibold text-white">
                    {lookup?.balance ?? 0}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/60">Generados en mi cafetería</div>
                  <div className="text-2xl font-semibold text-white">
                    {lookup?.availableInThisCafe ?? 0}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-white/60">Canjeado en mi cafetería</div>
                  <div className="text-2xl font-semibold text-white">
                    {lookup?.redeemedInThisCafe ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Últimos movimientos (solo MI cafetería) ---- */}
            <div className="border rounded-lg bg-white overflow-hidden mt-4">
              <button
                type="button"
                onClick={() => setOpenLast((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 font-medium hover:bg-gray-50"
              >
                <span>☕ Últimos movimientos</span>
                <span className="text-sm opacity-60">{openLast ? "−" : "+"}</span>
              </button>

              {openLast && (
                <div className="px-4 pb-4">
                  {(lookup?.last ?? []).length ? (
                    <div className="space-y-2 mt-2">
                      {(lookup?.last ?? []).map((t: any) => {
                        const meta = getTxMeta(t.tx_type);
                        const isMinus = t.tx_type === "redeem" || t.tx_type === "transfer_out";

                        return (
                          <div
                            key={t.id}
                            className="flex justify-between text-sm border-b pb-2"
                          >
                            <div>
                              <div className="font-medium">
                                {meta.icon} {meta.label}
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
                              {isMinus ? "-" : "+"}{t.amount}
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

        {debug && lastSummary && (
          <div style={{ marginTop: 16, padding: 12, border: "1px solid #ccc", borderRadius: 8, background: "#fafafa" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>DEBUG</div>
            <pre style={{ fontSize: 12, overflow: "auto" }}>{JSON.stringify(lastSummary, null, 2)}</pre>
          </div>
        )}

        {/* Sumar cafecitos */}
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <button
            type="button"
            onClick={() => setOpenAdd((v) => !v)}
            className="w-full flex items-center justify-between text-left font-semibold text-lg"
          >
            <span>☕ Sumar cafecitos</span>
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
                      className="w-full border rounded-lg px-3 py-2"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
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

        {/* Separador */}
        <div className="border-t border-neutral-200" />

        {/* Usar cafecitos / Post-canje success panel */}
        {redeemResult !== null ? (
          <section className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-4">
            <h2 className="text-lg font-semibold text-green-800">Canje procesado</h2>
            <p className="text-sm text-neutral-700">Cliente: {redeemResult.name} (CI {redeemResult.cedula})</p>
            <p className="text-sm text-neutral-700">Se canjearon: <strong>{redeemResult.redeemed}</strong></p>
            <p className="text-2xl font-semibold text-neutral-900">Saldo total restante: {redeemResult.balanceAfter}</p>
            <p className="text-sm text-neutral-700">Disponible en esta cafetería: {redeemResult.availableInThisCafeAfter}</p>
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
              <span>☕ Canjear cafecitos</span>
              <span>{openRedeem ? "▾" : "▸"}</span>
            </button>
            {openRedeem && (
              <>
                <p className="text-sm text-neutral-500">Descontar cafecitos cuando el cliente los usa (redeem).</p>
                <form onSubmit={onRedeem} className="space-y-3">
                  {consumer && redeemErrorMsg && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                      {redeemErrorMsg}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm block mb-1">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full border rounded-lg px-3 py-2"
                        value={redeemAmount}
                        onChange={(e) => setRedeemAmount(Number(e.target.value))}
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
                    disabled={!consumer || !canRedeem || loadingRedeem || redeemBlocked}
                    className="w-full rounded-lg px-3 py-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingRedeem ? "Canjeando..." : "Canjear"}
                  </button>
                </form>
              </>
            )}
          </section>
        )}

        {consumer && status && <div className="text-sm">{status}</div>}
      </div>
    </div>
  );
}
