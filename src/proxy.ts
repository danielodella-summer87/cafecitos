import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();

  // leer cookie de sesión
  const token = req.cookies.get("cafecitos_session")?.value;

  // rutas protegidas reales del sistema
  const protectedRoutes = [
    "/app/consumer",
    "/app/admin",
    "/app/owner",
  ];

  const isProtected = protectedRoutes.some((r) =>
    url.pathname.startsWith(r)
  );

  // si no hay sesión y la ruta es privada → login
  if (!token && isProtected) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
