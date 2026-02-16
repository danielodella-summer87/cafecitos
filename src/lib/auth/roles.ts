import type { SessionUser } from "./session";

export function requireAdmin(session: SessionUser | null): asserts session is SessionUser {
  if (!session) throw new Error("No autenticado");
  if (session.role !== "admin") throw new Error("Solo admin");
}
