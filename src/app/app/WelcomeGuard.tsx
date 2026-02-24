"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!pathname) return;

    // No redirigir en rutas públicas / onboarding
    if (
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/register/") ||
      pathname === "/app/login" ||
      pathname === "/app/register" ||
      pathname.startsWith("/app/register/")
    ) {
      return;
    }

    if (pathname === "/app/bienvenida") return;
    if (!shouldShowWelcome) return;
    if (didRedirectRef.current) return;

    didRedirectRef.current = true;
    setIsRedirecting(true);

    // micro-delay para que el overlay pinte antes del replace (mobile)
    const t = setTimeout(() => {
      router.replace("/app/bienvenida");
    }, 0);

    return () => clearTimeout(t);
  }, [pathname, router, shouldShowWelcome]);

  return (
    <>
      {children}

      {isRedirecting ? (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
          <div className="text-sm text-neutral-600">Cargando…</div>
        </div>
      ) : null}
    </>
  );
}
