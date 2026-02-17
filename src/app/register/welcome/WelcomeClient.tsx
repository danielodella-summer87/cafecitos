"use client";

import Link from "next/link";
import { PRO } from "@/lib/ui/pro";
import AppName from "@/app/ui/AppName";

export default function WelcomeClient(props: {
  name: string;
  cedula: string;
  tierName: string;
  tierSlug: string;
  badgeText: string;
  badgeMessage: string;
  dotColor: string;
  balance: number;
  welcomeBonus: number;
}) {
  const displayName = props.name || "¡Bienvenido/a!";
  const showCedula = props.cedula && props.cedula.length >= 6;

  return (
    <div className={PRO.page}>
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <img
              src="/logoamorperfecto.png"
              alt="Amor Perfecto"
              className="h-12 w-auto"
            />
            <div className="min-w-0">
              <div className="text-sm text-neutral-500"><AppName /></div>
              <h1 className="text-2xl font-semibold text-neutral-900 truncate">
                {displayName}
              </h1>
              {showCedula ? (
                <div className="text-sm text-neutral-500">Cédula: {props.cedula}</div>
              ) : null}
            </div>
          </div>

          <hr className="my-5 border-neutral-200" />

          <div className="rounded-xl bg-black text-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm opacity-90">
                {props.badgeText} · <span className="opacity-100">{props.badgeMessage}</span>
              </div>
              <div className="text-xs opacity-70 mt-1">
                Categoría: <span className="font-semibold">{props.tierName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: props.tierSlug === "plata" ? "#C0C0C0" : props.dotColor,
                  color: props.tierSlug === "plata" ? "#111827" : "#ffffff",
                }}
              >
                {props.tierName}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="rounded-xl border border-neutral-200 p-4">
              <div className="text-xs text-neutral-500">Tus cafecitos</div>
              <div className="text-3xl font-semibold text-neutral-900 mt-1">
                ☕ {props.balance}
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Saldo global disponible
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 p-4 bg-neutral-50">
              <div className="text-xs text-neutral-500">Cortesía de bienvenida</div>
              <div className="text-3xl font-semibold text-neutral-900 mt-1">
                🎁 {props.welcomeBonus}
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                (siempre que esté habilitada)
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-neutral-200 p-4">
            <div className="font-semibold text-neutral-900">Cómo funciona</div>
            <div className="mt-3 space-y-3 text-sm text-neutral-700">
              <div className="flex gap-3">
                <div className="shrink-0">✅</div>
                <div>
                  <b>Sumás cafecitos</b> cuando consumís en una cafetería adherida.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0">⭐</div>
                <div>
                  Tu saldo queda asociado a tu <b>cédula</b> (siempre usá la misma).
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0">🎁</div>
                <div>
                  Cuando juntás los necesarios, <b>canjeás</b> por beneficios (por ejemplo, un café).
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0">📚</div>
                <div>
                  En <b>Universo Café</b> tenés guías y tips (algunas según tu categoría).
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-white font-medium hover:bg-neutral-800"
            >
              Ir a iniciar sesión
            </Link>
            <p className="mt-3 text-xs text-neutral-500 text-center">
              Tip: tu PIN es de 4 dígitos. Si lo olvidás, la cafetería/administración te lo puede resetear.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
