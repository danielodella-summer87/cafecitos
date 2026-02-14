"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/app/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    const fd = new FormData(formRef.current!);

    startTransition(async () => {
      const res = await loginUser(fd);

      if (!res?.ok) {
        setStatus(res?.error ?? "No se pudo iniciar sesión");
        // vaciar campos siempre (incluye cédula y pin)
        formRef.current?.reset();
        return;
      }

      // vaciar campos antes de navegar
      formRef.current?.reset();
      router.push(res.redirectTo ?? "/app/consumer");
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-2xl p-8">
        <h1 className="text-3xl font-semibold">Cafecitos</h1>
        <p className="text-sm text-gray-600 mt-1">Accedé con tu cédula y PIN de 4 dígitos.</p>

        <form ref={formRef} onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
          <div>
            <label className="text-sm font-medium">Cédula</label>
            <input
              name="cedula"
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
              placeholder="••••"
              className="mt-1 w-full border rounded px-3 py-2"
              inputMode="numeric"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </button>

          {status ? <p className="text-sm text-red-600">{status}</p> : null}
        </form>
      </div>
    </div>
  );
}
