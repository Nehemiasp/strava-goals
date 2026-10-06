import "server-only";
import { NextResponse } from "next/server";
import { getSessionAthleteId } from "./session";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export const fail = (status: number, error: string) => json({ error }, status);

/** Defensa CSRF adicional a SameSite=Lax: las mutaciones solo se aceptan desde el mismo origen. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // peticiones no-navegador (curl, tests)
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function requireAthlete(): Promise<number | NextResponse> {
  const id = await getSessionAthleteId();
  return id ?? fail(401, "No has iniciado sesión");
}
