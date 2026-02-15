"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser } from "@/app/actions/auth";

const LoginHeader = () => {
  return (
    <div className="flex flex-col items-center text-center">
      <img
        src="/logoamorperfecto.png"
        alt="Amor Perfecto"
        className="
          w-40
          md:w-48
          h-auto
          mb-4
          opacity-95
        "
        loading="eager"
      />

      <h1 className="text-2xl font-semibold text-white">Cafecitos</h1>
      <div className="w-32 h-px bg-white/15 my-3" />
      <p className="text-sm text-white/70">
        Accede con tu cédula y pin de 4 dígitos.
      </p>
    </div>
  );
};

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
      <div className="w-full max-w-md border border-white/10 rounded-2xl bg-neutral-900 p-8">
        <div className="mb-6">
          <LoginHeader />
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
          <div>
            <label className="text-sm font-medium text-white/90">Cédula</label>
            <input
              name="cedula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="Ej: 40031685"
              className="mt-1 w-full border border-white/20 rounded px-3 py-2 bg-white/10 text-white placeholder-white/50"
              inputMode="numeric"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/90">PIN (4 dígitos)</label>
            <input
              name="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="mt-1 w-full border border-white/20 rounded px-3 py-2 bg-white/10 text-white placeholder-white/50"
              inputMode="numeric"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-white text-neutral-900 py-2 font-medium disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {status ? <p className="text-sm text-red-400">{status}</p> : null}
        </form>
      </div>
    </div>
  );
}
