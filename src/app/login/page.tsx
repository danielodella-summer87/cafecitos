"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser } from "@/app/actions/auth";
import { PRO } from "@/lib/ui/pro";

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
    <div className={`${PRO.center} min-h-screen py-8`}>
      <div className={PRO.container}>
        <div className={`${PRO.card} pb-8`}>
          {/* LOGO (ancho similar al título) */}
          <div className="mx-auto mb-4 w-[260px] md:w-[320px]">
            <Image
              src="/logoamorperfecto.png"
              alt="Amor Perfecto"
              width={320}
              height={160}
              className="w-full h-auto object-contain"
              priority
            />
          </div>

          <h1 className={PRO.h1}>Cafecitos</h1>
          <div className={PRO.divider} />
          <p className={PRO.subtitle}>Accede con tu cédula y pin de 4 dígitos.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
            <div>
              <label className={PRO.label}>Cédula</label>
              <input
                name="cedula"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej: 40031685"
                autoComplete="off"
                className={PRO.input}
                inputMode="numeric"
                required
              />
            </div>

            <div>
              <label className={PRO.label}>PIN (4 dígitos)</label>
              <input
                name="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                autoComplete="new-password"
                className={PRO.input}
                inputMode="numeric"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white hover:bg-black/90 active:bg-black/80 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {status ? <p className="text-sm text-red-600">{status}</p> : null}

            <div className="text-center text-sm text-neutral-600 mt-4">
              ¿No tenés cuenta?{" "}
              <a href="/register" className="font-medium text-neutral-900 underline">
                Registrarme
              </a>
            </div>

            <p className="text-center text-xs text-neutral-500 mt-2">
              © {new Date().getFullYear()} Amor Perfecto
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
