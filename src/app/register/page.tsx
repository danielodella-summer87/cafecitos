import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerUser } from "@/app/actions/auth";

export default function RegisterPage() {
  async function registerAndGoToLogin(formData: FormData) {
    "use server";
    const res = await registerUser(formData);
    if (res.ok) {
      redirect("/app/bienvenida");
      return;
    }
    redirect(`/register?error=${encodeURIComponent(res.error ?? "Error al registrar")}`);
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-sm p-6">
        <div className="flex flex-col items-center text-center gap-3">
          <Image
            src="/logoamorperfecto.png"
            alt="Amor Perfecto"
            width={160}
            height={80}
            className="h-20 w-auto"
          />
          <h1 className="text-2xl font-semibold text-neutral-900">Registrarme</h1>
          <p className="text-sm text-neutral-600">
            Creá tu cuenta con tu cédula y un PIN de 4 dígitos.
          </p>
        </div>

        <hr className="my-5 border-neutral-200" />

        <form action={registerAndGoToLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">
              Nombre y apellido
            </label>
            <input
              name="full_name"
              required
              maxLength={20}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
              placeholder="Ej: Rosyta Pérez"
              autoComplete="name"
            />
            <p className="mt-1 text-xs text-neutral-500">Máximo 20 caracteres.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">
              Cédula
            </label>
            <input
              name="cedula"
              inputMode="numeric"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
              placeholder="Ej: 40031685"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">
              PIN (4 dígitos)
            </label>
            <input
              name="pin"
              inputMode="numeric"
              required
              maxLength={4}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
              placeholder="****"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1">
              Teléfono (opcional)
            </label>
            <input
              name="phone"
              inputMode="tel"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
              placeholder="Ej: 097734735"
              autoComplete="tel"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 text-white py-2.5 font-medium hover:bg-neutral-800"
          >
            Crear cuenta
          </button>

          <div className="text-center text-sm text-neutral-600">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-neutral-900 underline">
              Volver al login
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Amor Perfecto
        </p>
      </div>
    </main>
  );
}
