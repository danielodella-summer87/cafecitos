"use client";

import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { markWelcomeSeen } from "@/app/actions/onboarding";
import { AppMark } from "@/components/brand/AppMark";
import {
  buildCafecitosWhatsAppUrl,
  WELCOME_GIFT_WHATSAPP_MESSAGE,
} from "@/lib/cafecitosWhatsApp";

export default function BienvenidaClient() {
  const [status, setStatus] = useState<"saving" | "ready">("saving");
  const welcomeGiftWhatsAppUrl = buildCafecitosWhatsAppUrl(WELCOME_GIFT_WHATSAPP_MESSAGE);

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
          Para activar tu regalo de bienvenida, escribinos por WhatsApp desde el número que registraste.
        </p>
        <p className="mt-3 text-sm text-neutral-700">
          Se abrirá WhatsApp con un mensaje listo para enviar.
        </p>
        <a
          href={welcomeGiftWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:ring-offset-2"
        >
          <Gift className="h-4 w-4 text-white" aria-hidden />
          Solicitar regalo por WhatsApp
        </a>
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
