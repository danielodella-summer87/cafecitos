"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (pathname === "/app/bienvenida") return;
    if (!shouldShowWelcome) return;
    router.replace("/app/bienvenida");
  }, [pathname, router, shouldShowWelcome]);

  return <>{children}</>;
}
