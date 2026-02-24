import { NextResponse } from "next/server";

const COOKIE_NAME = "cafecitos_session";

// TODO/PR: Este endpoint permite setear la cookie de sesión con profileId via body; validar autorización o eliminar si no se usa.
export async function POST(req: Request) {
  const { profileId } = await req.json();

  if (!profileId) {
    return NextResponse.json({ ok: false, error: "Missing profileId" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set(COOKIE_NAME, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
