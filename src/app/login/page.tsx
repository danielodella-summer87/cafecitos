"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser } from "@/app/actions/auth";

export default function LoginPage() {
  const router = useRouter();

  const [cedula, setCedula] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await loginUser({ cedula, pin });

      if (!res?.ok) {
        setStatus(res?.error ?? "No se pudo iniciar sesión");
        return;
      }

      setCedula("");
      setPin("");
      router.replace(res.redirectTo ?? "/app/consumer");
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Error de login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">

        {/* LOGO */}
        <div className="mx-auto mb-4 w-[220px] md:w-[260px] h-[56px] md:h-[64px] overflow-hidden flex items-center justify-center">
          <img
            src="/logoamorperfecto.png"
            alt="Amor Perfecto"
            className="w-full h-auto object-contain scale-[2.2] origin-center"
          />
        </div>

        {/* TITULO */}
        <h1 className="text-center text-2xl font-semibold text-neutral-900">
          Cafecitos
        </h1>

        <div className="mx-auto mt-3 mb-4 h-px w-16 bg-neutral-300" />

        <p className="text-center text-sm text-neutral-500 mb-6">
          Accede con tu cédula y pin de 4 dígitos.
        </p>

        {/* FORM */}
        <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="text-sm text-neutral-700">Cédula</label>
            <input
              name="cedula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ej: 40031685"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900"
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="text-sm text-neutral-700">PIN (4 dígitos)</label>
            <input
              name="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900"
              inputMode="numeric"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-neutral-900 text-white py-2 font-medium hover:bg-neutral-800 transition disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {status ? <p className="text-sm text-red-600">{status}</p> : null}
        </form>
      </div>
    </div>
  );
}
