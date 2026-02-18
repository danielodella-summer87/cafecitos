import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** Hashea un PIN (p. ej. 4 dígitos) para guardar en DB. Mismo algoritmo que profiles. */
export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin.trim(), SALT_ROUNDS);
}

/** Verifica un PIN contra el hash guardado. */
export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin.trim(), hash);
}
