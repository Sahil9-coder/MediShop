// ============================================================
// src/lib/utils/pin.ts
// PIN hashing + verification using bcryptjs.
// PIN is NEVER stored in plain text — only the bcrypt hash.
// ============================================================

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** Hash a 4-6 digit PIN. Returns bcrypt hash string. */
export async function hashPin(pin: string): Promise<string> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("PIN must be 4–6 digits.");
  }
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/** Verify a PIN against its stored hash. */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
