"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser, createOwner, registerUser } from "@/app/actions/auth";

export default function LoginPage() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get("mode");
  const isOwnerMode = mode === "owner";

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("mode", mode ?? "");

    try {
      const result = await loginUser(formData);
      if (result.ok) {
        router.push(result.redirectTo);
        return;
      }
      setError(result.error);
    } catch (err: any) {
      setError(err?.message ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Header PRO solo visual */}
      {isOwnerMode && (
        <div className="w-full bg-black text-white">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-sm font-semibold">
                O
              </div>
              <div>
                <div className="text-sm text-white/70">Cafecitos</div>
                <div className="text-base font-semibold">Owner Console</div>
              </div>
            </div>

            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              🔒 Modo Owner
            </span>
          </div>
        </div>
      )}

      <div className="min-h-[calc(100vh-0px)] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl font-semibold">Cafecitos</h1>

            {isOwnerMode && (
              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">
                Owner
              </span>
            )}
          </div>

          <p className="text-neutral-500 mb-6">
            {isOwnerMode
              ? "Acceso administrativo para gestión y cargas."
              : "Accedé con tu cédula y PIN de 4 dígitos."}
          </p>

          {/* Mensaje informativo (sin restricción) */}
          {isOwnerMode && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              🔒 <strong>Panel Owner</strong> — se espera un usuario{" "}
              <strong>owner</strong>.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input type="hidden" name="mode" value={mode ?? ""} />
            <div>
              <label className="text-sm font-medium">Cédula</label>
              <input
                name="cedula"
                placeholder="Ej: 15195319"
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">PIN (4 dígitos)</label>
              <input
                name="pin"
                placeholder="Ej: 1234"
                type="password"
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-black py-3 text-white font-medium disabled:opacity-60"
            >
              {loading ? "Entrando..." : mode === "owner" ? "Entrar al Panel Owner" : "Entrar"}
            </button>

            {isOwnerMode ? (
              <div className="text-xs text-neutral-500">
                Tip: usá <code className="rounded bg-neutral-100 px-1">/login</code>{" "}
                para modo consumidor.
              </div>
            ) : (
              <div className="text-xs text-neutral-500">
                Para dueños de cafetería: <a href="/login?mode=owner" className="underline">Modo Owner</a>.
              </div>
            )}
          </form>

          {/* Form de registro consumer: cuando mode !== owner */}
          {!isOwnerMode && (
            <div className="my-6 border-t border-neutral-200 pt-6">
              <h2 className="text-sm font-semibold text-neutral-700 mb-3">Crear cuenta (cliente)</h2>
              <form action={registerUser} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Cédula</label>
                  <input
                    name="cedula"
                    placeholder="Ej: 15195319"
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Celular (opcional)</label>
                  <input
                    name="phone"
                    placeholder="Celular"
                    className="mt-1 w-full rounded-md border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">PIN (4 dígitos)</label>
                  <input
                    name="pin"
                    placeholder="Ej: 1234"
                    type="password"
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md border border-neutral-300 py-3 font-medium hover:bg-neutral-50"
                >
                  Registrar como cliente
                </button>
              </form>
            </div>
          )}

          {/* Form de registro owner: solo cuando mode=owner */}
          {isOwnerMode && (
            <>
              <div className="my-6 border-t border-neutral-200 pt-6">
                <h2 className="text-sm font-semibold text-neutral-700 mb-3">Crear cuenta owner</h2>
                <form action={createOwner} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nombre completo</label>
                    <input
                      name="full_name"
                      placeholder="Ej: María García"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nombre de la cafetería</label>
                    <input
                      name="cafe_name"
                      placeholder="Ej: Café del Centro"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cédula</label>
                    <input
                      name="cedula"
                      placeholder="Ej: 15195319"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">PIN (4 dígitos)</label>
                    <input
                      name="pin"
                      placeholder="Ej: 1234"
                      type="password"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md border border-neutral-300 py-3 font-medium hover:bg-neutral-50"
                  >
                    Registrar como owner
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

