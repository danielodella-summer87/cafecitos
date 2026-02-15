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

      // limpiar campos SIEMPRE
      setCedula("");
      setPin("");

      // redirect según rol (auth devuelve redirectTo)
      router.replace(res.redirectTo ?? "/app/consumer");
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Error de login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-2xl p-8">
        <h1 className="text-3xl font-semibold">Cafecitos</h1>
        <p className="text-sm text-gray-600 mt-1">Accedé con tu cédula y PIN de 4 dígitos.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
          <div>
            <label className="text-sm font-medium">Cédula</label>
            <input
              name="cedula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ej: 40031685"
              className="mt-1 w-full border rounded px-3 py-2"
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">PIN (4 dígitos)</label>
            <input
              name="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="mt-1 w-full border rounded px-3 py-2"
              inputMode="numeric"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {status ? <p className="text-sm text-red-600">{status}</p> : null}
        </form>
      </div>
    </div>
  );
}
