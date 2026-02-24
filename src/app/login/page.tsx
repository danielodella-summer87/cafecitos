"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser } from "@/app/actions/auth";
import { isValidCi, normalizeCi } from "@/lib/ci";
import { PRO } from "@/lib/ui/pro";
import { AppMark } from "@/components/brand/AppMark";

export default function LoginPage() {
  const router = useRouter();

  const [cedula, setCedula] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidCi(cedula)) {
      setStatus("Ingresá los 8 dígitos de la cédula.");
      return;
    }
    setLoading(true);
    setStatus(null);

    try {
      const res = await loginUser({ cedula: cedula.trim(), pin });

      if (!res?.ok) {
        setStatus(res?.error ?? "No se pudo iniciar sesión");
        return;
      }

      setCedula("");
      setPin("");
      const target = (res as { redirectTo?: string })?.redirectTo ?? "/app/consumer";
      router.replace(target);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Error de login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${PRO.center} min-h-screen py-8`}>
      <div className={PRO.container}>
        <div className={`${PRO.card} pb-8 !bg-[#F6EFE6] border border-[rgba(15,23,42,0.08)]`}>
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

          <h1 className={PRO.h1}><AppMark /></h1>
          <div className={PRO.divider} />
          <p className={PRO.subtitle}>Accede con tu cédula y pin de 4 dígitos.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
            <div>
              <label className={PRO.label}>Cédula</label>
              <input
                type="text"
                name="cedula"
                value={cedula}
                onChange={(e) => setCedula(normalizeCi(e.target.value))}
                placeholder="8 dígitos"
                autoComplete="off"
                className={PRO.input}
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
              {cedula.length > 0 && !isValidCi(cedula) && (
                <p className="text-xs text-amber-600 mt-1">La cédula debe tener exactamente 8 dígitos.</p>
              )}
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
              disabled={!isValidCi(cedula) || loading}
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
              © 2026 Summer87 / Daniel Odella
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
