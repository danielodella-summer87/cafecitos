import { cookies } from "next/headers"
export const COOKIE_NAME = "cafecitos_session"
export type SessionUser = {
  profileId?: string | null
  staffId?: string | null
  role: "owner" | "staff" | "consumer" | "admin"
  cafeId?: string | null
  fullName?: string | null
  phone?: string | null
  is_owner?: boolean
  can_issue?: boolean
  can_redeem?: boolean
}

/** Crea un token tipo JWT (header.payload) para la cookie de sesión. */
export function signSessionToken(payload: {
  profileId?: string | null
  staffId?: string | null
  role: SessionUser["role"]
  cafeId?: string | null
  fullName?: string | null
  is_owner?: boolean
  can_issue?: boolean
  can_redeem?: boolean
}): string {
  const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "HS256" })).toString("base64url")
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${header}.${payloadB64}`
}

/**
 * Decodifica base64url (JWT) -> string
 */
function base64UrlDecode(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4)
  const base64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(base64, "base64").toString("utf-8")
}

/**
 * Lee cafecitos_session (JWT) y devuelve el payload como objeto.
 * (Sin verificar firma; para UI/guards alcanza en local.)
 */
export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set(COOKIE_NAME, "", { path: "/", maxAge: 0 })
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const parts = token.split(".")
    if (parts.length < 2) return null

    const payloadStr = base64UrlDecode(parts[1])
    const payload = JSON.parse(payloadStr)

    const profileId = payload.profileId ?? payload.profile_id ?? payload.profileID ?? null
    const staffId = payload.staffId ?? payload.staff_id ?? null
    const role = payload.role
    const cafeId = payload.cafeId ?? payload.cafe_id ?? null
    const fullName = payload.fullName ?? payload.full_name ?? null
    const is_owner = payload.is_owner ?? null
    const can_issue = payload.can_issue ?? null
    const can_redeem = payload.can_redeem ?? null

    if (!role) return null
    if (!profileId && !staffId) return null

    return { profileId, staffId, role, cafeId, fullName, is_owner, can_issue, can_redeem }
  } catch {
    return null
  }
}