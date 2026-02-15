import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()

  const session = req.cookies.get("session")

  // si entra al root
  if (url.pathname === "/") {
    if (!session) {
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    // si hay sesión dejamos que la app redirija internamente
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/"],
}
