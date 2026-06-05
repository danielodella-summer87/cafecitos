"use client";

import { useEffect, useState } from "react";
import { markWelcomeSeen } from "@/app/actions/onboarding";
import { AppMark } from "@/components/brand/AppMark";

export default function BienvenidaClient() {
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

  const continuar = async () => {
    setStatus("saving");
    try {
      await markWelcomeSeen();
    } catch (_) {
      // continue anyway so user isn't stuck
    }
    // Navegación dura: fuerza re-render del layout /app con welcome_seen_at ya
    // seteado, evitando el shouldShowWelcome stale del WelcomeGuard (overlay
    // "Cargando…" permanente). No usamos router.replace porque en navegación
    // cliente el layout compartido no se recalcula de inmediato.
    window.location.assign("/app/consumer");
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">👋 Bienvenido a <AppMark /></h1>
      <p className="mt-2 text-neutral-600">Te contamos en 30 segundos cómo funciona.</p>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <p className="text-neutral-800">
          ¡Listo! En breve te enviaremos un WhatsApp con un código para obtener un primer regalo de AmorPerfecto: un
          paquete de café y la acreditación de tus primeros cafecitos.
        </p>
        <p className="mt-3 text-sm text-neutral-700">
          Te llegará por WhatsApp. Si no lo recibís en 2 minutos, pedile a la cafetería que lo reenvíe.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="font-semibold">✅ Cómo ganás cafecitos</div>
          <div className="mt-1 text-neutral-700">
            Cada vez que consumís en una cafetería adherida, te acreditan cafecitos.
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 font-semibold">
          <AppMark iconOnly iconSize={18} />
          Cómo canjeás
        </div>
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
