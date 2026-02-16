"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markWelcomeSeen } from "@/app/actions/onboarding";

export default function BienvenidaClient() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        await markWelcomeSeen();
      } catch (err) {
        console.warn("markWelcomeSeen fallo (no bloqueante):", err);
      } finally {
        if (!mounted) return;
        setTimeout(() => {
          router.replace("/app/consumer");
        }, 1200);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main style={{ maxWidth: 880, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
        👋 Bienvenido a Cafecitos
      </h1>
      <p style={{ opacity: 0.75, marginBottom: 24 }}>
        Te contamos en 30 segundos cómo funciona.
      </p>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>✅ Cómo ganás cafecitos</h2>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Cada vez que consumís en una cafetería adherida, te acreditan cafecitos.
        </p>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>☕ Cómo canjeás</h2>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Cuando llegás al mínimo requerido, podés canjear por un café (o beneficio disponible).
        </p>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 18, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>⭐ Niveles</h2>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          A medida que acumulás cafecitos, subís de nivel y desbloqueás mejores beneficios.
        </p>
      </div>

      <button
        onClick={() => router.replace("/app/consumer")}
        style={{
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "12px 16px",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Entendido, ir a mi cuenta →
      </button>
    </main>
  );
}
