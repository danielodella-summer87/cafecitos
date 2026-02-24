"use client";

import { setModeStaff, setModeConsumer } from "./actions";

export default function ChooseModeClient() {
  return (
    <div className="rounded-2xl border border-[rgba(15,23,42,0.1)] bg-white p-8 shadow-sm max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[#0F172A]">¿Cómo querés entrar?</h2>
        <p className="text-sm text-neutral-500 mt-1">Podés cambiarlo más adelante desde el menú.</p>
      </div>
      <div className="grid gap-3">
        <form action={setModeStaff} className="block">
          <button
            type="submit"
            className="w-full rounded-xl border-2 border-amber-200 bg-amber-50 py-4 px-4 text-base font-medium text-amber-900 hover:bg-amber-100 hover:border-amber-300 transition"
          >
            Entrar como Staff
          </button>
        </form>
        <form action={setModeConsumer} className="block">
          <button
            type="submit"
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-4 px-4 text-base font-medium text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition"
          >
            Entrar como Cliente
          </button>
        </form>
      </div>
    </div>
  );
}
