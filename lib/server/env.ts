import "server-only";

const prod = process.env.NODE_ENV === "production";

export const hasStrava = () => Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);

export const hasSupabase = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Modo demo: datos de ejemplo en memoria, sin Strava ni Supabase.
 * Solo se activa explícitamente (`DEMO_MODE=1`) o, en desarrollo, cuando faltan las credenciales de Strava.
 * En producción sin credenciales NO se activa: la app falla de forma visible.
 */
export const isDemo = () => process.env.DEMO_MODE === "1" || (!prod && !hasStrava());

export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

/** Secreto de sesión. En desarrollo hay un valor fijo para no bloquear el arranque. */
export function sessionSecret(): Uint8Array {
  const v = process.env.SESSION_SECRET;
  if (!v) {
    if (prod) throw new Error("Falta la variable de entorno SESSION_SECRET");
    return new TextEncoder().encode("dev-only-session-secret-change-me-0123456789");
  }
  return new TextEncoder().encode(v);
}

/** Clave AES-256 (32 bytes en base64) para cifrar los tokens de Strava en reposo. */
export function tokenKey(): Buffer {
  const v = process.env.TOKEN_ENC_KEY;
  if (!v) {
    if (prod) throw new Error("Falta la variable de entorno TOKEN_ENC_KEY");
    return Buffer.alloc(32, 7);
  }
  const key = Buffer.from(v, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENC_KEY debe ser 32 bytes en base64 (openssl rand -base64 32)");
  return key;
}

export function appOrigin(req: Request): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
}
