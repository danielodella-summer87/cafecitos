"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const [status, setStatus] = useState("Probando conexión con Supabase...");

  useEffect(() => {
    (async () => {
      // Intentamos consultar una tabla que aún NO existe (healthcheck)
      // Si devuelve error "relation does not exist", igual confirma conexión.
      const { error } = await supabase.from("healthcheck").select("*").limit(1);

      if (!error) {
        setStatus("Conectado a Supabase ✅ (tabla healthcheck existe)");
        return;
      }

      // Si el error es porque no existe la tabla, igual estamos conectados.
      if ((error as any)?.message?.includes("relation") || (error as any)?.code === "42P01") {
        setStatus("Conectado a Supabase ✅ (tabla healthcheck aún no existe)");
        return;
      }

      // Otro error: lo mostramos.
      setStatus(`Error conectando con Supabase ❌: ${(error as any)?.message ?? "desconocido"}`);
    })();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Cafecitos</h1>
      <p className="mt-4">{status}</p>
    </main>
  );
}
