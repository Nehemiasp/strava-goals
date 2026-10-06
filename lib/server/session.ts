import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { sessionSecret } from "./env";

export const SESSION_COOKIE = "sg_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function createSession(athleteId: number): Promise<void> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(athleteId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(sessionSecret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Devuelve el id del atleta de la sesión, o `null` si no hay sesión válida. */
export async function getSessionAthleteId(): Promise<number | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isSafeInteger(id) ? id : null;
  } catch {
    return null;
  }
}
