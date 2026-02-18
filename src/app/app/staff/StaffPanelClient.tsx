"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ownerGetConsumerSummary } from "@/app/actions/ownerSummary";
import { ownerAddCafecitos } from "@/app/actions/owner";
import { ownerRedeemCafecitos } from "@/app/actions/ownerRedeem";
import { logout } from "@/app/actions/auth";
import { PRO } from "@/lib/ui/pro";

type Props = {
  canIssue: boolean;
  canRedeem: boolean;
  isInactive?: boolean;
  staffName?: string | null;
  cafeName?: string | null;
};

type ClientSummary = {
  name: string;
  cedula: string;
  balance: number;
  availableInThisCafe: number;
};

export default function StaffPanelClient({ canIssue, canRedeem, isInactive = false, staffName = null, cafeName = null }: Props) {
  const router = useRouter();
  const [cedula, setCedula] = useState("");
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [issueQty, setIssueQty] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [redeemQty, setRedeemQty] = useState("");
  const [redeemNote, setRedeemNote] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [openAdd, setOpenAdd] = useState(true);
  const [openRedeem, setOpenRedeem] = useState(true);

  const show = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const refreshClient = async () => {
    if (!client) return;
    try {
      const res = await ownerGetConsumerSummary({ cedula: client.cedula });
      if (!res.error && res.profile) {
        setClient({
          name: res.profile.full_name ?? "Cliente",
          cedula: res.profile.cedula ?? client.cedula,
          balance: res.balance ?? 0,
          availableInThisCafe: res.availableInThisCafe ?? 0,
        });
      }
    } catch {
      // keep current client state on refresh error
    }
  };

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cedula.replace(/\D/g, "").trim();
    if (clean.length < 6) {
      setLookupError("Ingresá una cédula válida (mín. 6 dígitos).");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setClient(null);
    try {
      const res = await ownerGetConsumerSummary({ cedula: clean });
      if (res.error || !res.profile) {
        setLookupError(res.error ?? "No existe un usuario con esa cédula");
        return;
      }
      setClient({
        name: res.profile.full_name ?? "Cliente",
        cedula: res.profile.cedula ?? clean,
        balance: res.balance ?? 0,
        availableInThisCafe: res.availableInThisCafe ?? 0,
      });
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Error al buscar");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canIssue || !client) return;
    const amt = parseInt(issueQty, 10);
    if (Number.isNaN(amt) || amt < 1) {
      show("err", "Cantidad inválida");
      return;
    }
    setIssueLoading(true);
    try {
      await ownerAddCafecitos({ cedula: client.cedula, amount: amt, note: issueNote.trim() || undefined });
      show("ok", "Cafecitos asignados");
      setIssueQty("");
      setIssueNote("");
      await refreshClient();
    } catch (err) {
      show("err", err instanceof Error ? err.message : "Error al asignar");
    } finally {
      setIssueLoading(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRedeem || !client) return;
    const amt = parseInt(redeemQty, 10);
    if (Number.isNaN(amt) || amt < 1) {
      show("err", "Cantidad inválida");
      return;
    }
    if (amt > client.availableInThisCafe) {
      show("err", "Saldo insuficiente en esta cafetería");
      return;
    }
    setRedeemLoading(true);
    try {
      const res = await ownerRedeemCafecitos({ cedula: client.cedula, amount: amt, note: redeemNote.trim() || undefined });
      if (res.ok) {
        show("ok", "Canje realizado");
        setRedeemQty("");
        setRedeemNote("");
        await refreshClient();
      } else {
        show("err", res.error ?? "Error al canjear");
      }
    } catch (err) {
      show("err", err instanceof Error ? err.message : "Error al canjear");
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (isInactive) {
    return (
      <div className="min-h-screen py-6 px-4 bg-[#F6EFE6]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-bold">
            Funcionario
            <span className="block sm:inline ml-0 sm:ml-2 font-normal text-base text-slate-600">
              — {staffName ?? "—"} | {cafeName ?? "—"}
            </span>
          </h1>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 text-sm font-medium"
          >
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 bg-[#F6EFE6]">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold">
          Funcionario
          <span className="block sm:inline ml-0 sm:ml-2 font-normal text-base text-slate-600">
            — {staffName ?? "—"} | {cafeName ?? "—"}
          </span>
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg px-4 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 text-sm font-medium"
        >
          Salir
        </button>
      </div>

      <p className="text-sm text-neutral-600 mb-4">Buscar cliente por cédula. Luego podés sumar o canjear cafecitos según tus permisos.</p>

      <form onSubmit={handleBuscar} className="space-y-2 mb-4">
        <label className={PRO.label}>Cédula del cliente</label>
        <div className="flex gap-2">
          <input
            className={PRO.input}
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Ej: 40031685"
            inputMode="numeric"
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="rounded-lg px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
          >
            {lookupLoading ? "Buscando…" : "Buscar"}
          </button>
        </div>
        {lookupError && <p className="text-sm text-red-600" role="alert">{lookupError}</p>}
      </form>

      {client !== null && (
        <>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 mb-4 shadow-sm">
            <div className="font-semibold text-lg">{client.name}</div>
            <div className="text-sm text-neutral-500 mt-1">Cédula: {client.cedula}</div>
            <div className="mt-3 flex gap-4">
              <div>
                <span className="text-xs text-neutral-500">Saldo total</span>
                <div className="text-xl font-semibold">{client.balance}</div>
              </div>
              <div>
                <span className="text-xs text-neutral-500">Disponible en esta cafetería</span>
                <div className="text-xl font-semibold text-green-700">{client.availableInThisCafe}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {canIssue && (
              <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenAdd((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 font-medium hover:bg-neutral-50 text-left"
                >
                  <span>Sumar cafecitos</span>
                  <span className="text-neutral-400">{openAdd ? "▾" : "▸"}</span>
                </button>
                {openAdd && (
                  <form onSubmit={handleAdd} className="px-4 pb-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Cantidad</label>
                      <input
                        className={PRO.input}
                        type="number"
                        min={1}
                        value={issueQty}
                        onChange={(e) => setIssueQty(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Nota (opcional)</label>
                      <input
                        className={PRO.input}
                        value={issueNote}
                        onChange={(e) => setIssueNote(e.target.value)}
                        placeholder="Ej: Compra en barra"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={issueLoading || !issueQty || parseInt(issueQty, 10) < 1}
                      className="rounded-lg px-4 py-2 bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {issueLoading ? "Asignando…" : "Asignar cafecitos"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {canRedeem && (
              <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenRedeem((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 font-medium hover:bg-neutral-50 text-left"
                >
                  <span>Canjear cafecitos</span>
                  <span className="text-neutral-400">{openRedeem ? "▾" : "▸"}</span>
                </button>
                {openRedeem && (
                  <form onSubmit={handleRedeem} className="px-4 pb-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Cantidad</label>
                      <input
                        className={PRO.input}
                        type="number"
                        min={1}
                        max={client.availableInThisCafe}
                        value={redeemQty}
                        onChange={(e) => setRedeemQty(e.target.value)}
                        placeholder="1"
                      />
                      <p className="text-xs text-neutral-500 mt-1">Máximo en esta cafetería: {client.availableInThisCafe}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Nota (opcional)</label>
                      <input
                        className={PRO.input}
                        value={redeemNote}
                        onChange={(e) => setRedeemNote(e.target.value)}
                        placeholder="Canje"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={
                        redeemLoading ||
                        client.availableInThisCafe < 1 ||
                        !redeemQty ||
                        parseInt(redeemQty, 10) < 1 ||
                        parseInt(redeemQty, 10) > client.availableInThisCafe
                      }
                      className="rounded-lg px-4 py-2 bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
                    >
                      {redeemLoading ? "Canjeando…" : "Canjear"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {message !== null && (
        <p className={`text-sm mt-4 ${message.type === "ok" ? "text-green-700" : "text-red-600"}`} role="alert">
          {message.text}
        </p>
      )}

      {!canIssue && !canRedeem && !isInactive && (
        <p className="text-sm text-neutral-500 mt-4">No tenés permisos para asignar ni canjear. Contactá al dueño.</p>
      )}
    </div>
  );
}
