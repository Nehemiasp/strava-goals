import { NextResponse } from "next/server";
import { encrypt } from "@/lib/server/crypto";
import { appOrigin } from "@/lib/server/env";
import { createSession } from "@/lib/server/session";
import { exchangeCode } from "@/lib/server/strava";
import { getStore } from "@/lib/server/store";

export async function GET(req: Request) {
  const origin = appOrigin(req);
  const url = new URL(req.url);
  const back = (error: string) => {
    const res = NextResponse.redirect(`${origin}/connect?error=${error}`);
    res.cookies.delete({ name: "sg_oauth_state", path: "/api/auth" });
    return res;
  };

  if (url.searchParams.get("error")) return back("denied");

  const cookieState = req.headers.get("cookie")?.match(/(?:^|;\s*)sg_oauth_state=([^;]+)/)?.[1];
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (!code || !state || !cookieState || state !== cookieState) return back("state");

  // El usuario puede desmarcar el permiso de actividades privadas en la pantalla de Strava.
  const scope = url.searchParams.get("scope") ?? "";
  if (!scope.split(",").includes("activity:read_all")) return back("scope");

  try {
    const t = await exchangeCode(code);
    if (!t.athlete) return back("strava");
    const store = await getStore();
    const existing = await store.getAthlete(t.athlete.id);
    await store.upsertAthlete({
      id: t.athlete.id,
      name: [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(" ") || "Atleta",
      avatar: t.athlete.profile && t.athlete.profile.startsWith("http") ? t.athlete.profile : null,
      accessTokenEnc: encrypt(t.access_token),
      refreshTokenEnc: encrypt(t.refresh_token),
      expiresAt: t.expires_at,
      syncedAt: existing?.syncedAt ?? null,
    });
    await createSession(t.athlete.id);
  } catch {
    return back("strava");
  }

  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.delete({ name: "sg_oauth_state", path: "/api/auth" });
  return res;
}
