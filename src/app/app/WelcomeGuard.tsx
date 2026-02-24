"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function WelcomeGuard({
  shouldShowWelcome,
  children,
}: {
  shouldShowWelcome: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const didRedirectRef = useRef(false);

  useEffect(() => {
    // pathname puede venir null en escenarios raros; evitamos ruido
    if (!pathname) return;

    // Nunca redirigir desde la propia bienvenida
    if (pathname === "/app/bienvenida") return;

    // No bloquear rutas públicas / onboarding / auth
    const isPublicOrOnboarding =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/register/") ||
      pathname === "/app/login" ||
      pathname === "/app/register" ||
      pathname.startsWith("/app/register/");

    if (isPublicOrOnboarding) return;

    // Si no hay que mostrar bienvenida, no hacemos nada
    if (!shouldShowWelcome) return;

    // Evitar bucles de replace en móvil / re-renders
    if (didRedirectRef.current) return;
    didRedirectRef.current = true;

    router.replace("/app/bienvenida");
  }, [pathname, router, shouldShowWelcome]);

  return <>{children}</>;
}
