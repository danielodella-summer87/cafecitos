"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markWelcomeSeen } from "@/app/actions/onboarding";
import AppName from "@/app/ui/AppName";

export default function BienvenidaClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"saving" | "ready">("saving");

  useEffect(() => {
    let cancelled = false;

    const t = setTimeout(() => {
      if (cancelled) return;
      setStatus("ready");
    }, 2500);

    (async () => {
      try {
        await markWelcomeSeen();
      } catch (_) {
        // ignore
      } finally {
        if (cancelled) return;
        clearTimeout(t);
        setStatus("ready");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const continuar = () => {
    router.replace("/app/consumer");
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">👋 Bienvenido a <AppName /></h1>
      <p className="mt-2 text-neutral-600">Te contamos en 30 segundos cómo funciona.</p>

      <div className="mt-8 space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="font-semibold">✅ Cómo ganás cafecitos</div>
          <div className="mt-1 text-neutral-700">
            Cada vez que consumís en una cafetería adherida, te acreditan cafecitos.
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="font-semibold">☕ Cómo canjeás</div>
          <div className="mt-1 text-neutral-700">
            Cuando llegás al mínimo requerido, podés canjear por un café (o beneficio disponible).
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="font-semibold">⭐ Niveles</div>
          <div className="mt-1 text-neutral-700">
            A medida que acumulás cafecitos, subís de nivel y desbloqueás mejores beneficios.
          </div>
        </div>
      </div>

      <div className="mt-8">
        {status === "saving" ? (
          <button
            className="rounded-xl bg-neutral-700 px-5 py-3 font-semibold text-white opacity-80"
            disabled
          >
            Guardando...
          </button>
        ) : (
          <button
            className="rounded-xl bg-black px-5 py-3 font-semibold text-white"
            onClick={continuar}
          >
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}
