"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import AppName from "@/app/ui/AppName";

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

      const err = error as { message?: string; code?: string };
      if (err?.message?.includes("relation") || err?.code === "42P01") {
        setStatus("Conectado a Supabase ✅ (tabla healthcheck aún no existe)");
        return;
      }

      setStatus(`Error conectando con Supabase ❌: ${err?.message ?? "desconocido"}`);
    })();
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold"><AppName /></h1>
      <p className="mt-4">{status}</p>
    </main>
  );
}
