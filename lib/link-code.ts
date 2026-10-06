import { randomInt } from "node:crypto";

// Sin I, O, 0 ni 1 para que el código se pueda dictar o leer sin confusiones. 32 símbolos × 8 posiciones = 40 bits.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export function generateCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Acepta "abcd-efgh", espacios y minúsculas. Devuelve `null` si no tiene la forma de un código. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CODE_RE.test(code) ? code : null;
}

export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
