"use client";

import { useState, useTransition } from "react";
import { createOwnerAndCafe } from "@/app/actions/admin";

export default function AdminPanelClient() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("");

  const [ownerName, setOwnerName] = useState("");
  const [ownerCedula, setOwnerCedula] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [cafeName, setCafeName] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    startTransition(async () => {
      const res = await createOwnerAndCafe({
        ownerName,
        ownerCedula,
        ownerPin,
        cafeName,
      });

      if (!res.ok) {
        setStatus(res.error ?? "No se pudo crear el owner");
        return;
      }

      setStatus(`✅ Owner creado. Café: ${res.cafeName}`);
      setOwnerName("");
      setOwnerCedula("");
      setOwnerPin("");
      setCafeName("");
    });
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-6">
      <div className="w-full max-w-xl border rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Panel Admin</h1>
          <a className="text-sm underline" href="/login">
            Volver al login
          </a>
        </div>

        <p className="text-sm text-gray-600 mt-2">
          Crear un owner (dueño) y su cafetería.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Nombre del dueño</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ej: Gastón"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Cédula del dueño</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={ownerCedula}
                onChange={(e) => setOwnerCedula(e.target.value)}
                placeholder="Ej: 15195319"
                inputMode="numeric"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">PIN del dueño</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={ownerPin}
                onChange={(e) => setOwnerPin(e.target.value)}
                placeholder="4 dígitos"
                inputMode="numeric"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Nombre de la cafetería</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={cafeName}
                onChange={(e) => setCafeName(e.target.value)}
                placeholder="Ej: Gastolandia Cafe"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
          >
            {isPending ? "Creando..." : "Crear owner + cafetería"}
          </button>

          {status ? <p className="text-sm mt-2">{status}</p> : null}
        </form>
      </div>
    </div>
  );
}
