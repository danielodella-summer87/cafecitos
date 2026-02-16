"use client";

import { useState } from "react";
import Link from "next/link";

export default function NivelesClient() {
  const [tab, setTab] = useState<"clientes" | "cafeterias">("clientes");

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 20 }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Niveles</h1>
          <p style={{ opacity: 0.6 }}>Clientes y cafeterías por separado.</p>
        </div>

        <Link
          href="/app/admin"
          style={{
            border: "1px solid #111",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Volver al Panel Admin
        </Link>
      </div>

      {/* TABS */}
      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={() => setTab("clientes")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #111",
            background: tab === "clientes" ? "#111" : "transparent",
            color: tab === "clientes" ? "#fff" : "#111",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Clientes
        </button>

        <button
          type="button"
          onClick={() => setTab("cafeterias")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #111",
            background: tab === "cafeterias" ? "#111" : "transparent",
            color: tab === "cafeterias" ? "#fff" : "#111",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Cafeterías
        </button>
      </div>

      {/* CONTENIDO */}
      <div style={{ marginTop: 20 }}>
        {tab === "clientes" && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
            <h2 style={{ fontWeight: 800 }}>Niveles de Clientes</h2>
            <p>UI existente de clientes va aquí.</p>
          </div>
        )}

        {tab === "cafeterias" && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
            <h2 style={{ fontWeight: 800 }}>Niveles de Cafeterías</h2>
            <p>UI existente de cafeterías va aquí.</p>
          </div>
        )}
      </div>
    </main>
  );
}
