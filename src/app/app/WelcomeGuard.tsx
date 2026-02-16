"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WelcomeGuard({
  welcomeSeenAt,
  children,
}: {
  welcomeSeenAt: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (welcomeSeenAt !== null) return;
    if (pathname === "/app/bienvenida") return;
    router.replace("/app/bienvenida");
  }, [welcomeSeenAt, pathname, router]);

  return <>{children}</>;
}
