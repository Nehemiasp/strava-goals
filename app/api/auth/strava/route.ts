import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { DEMO_ATHLETE_ID, DEMO_PARTNER_ID } from "@/lib/server/demo";
import { appOrigin, isDemo } from "@/lib/server/env";
import { createSession } from "@/lib/server/session";
import { authorizeUrl } from "@/lib/server/strava";
import { getStore } from "@/lib/server/store";
import { demoGoals } from "@/lib/server/demo";
import { todayLocal } from "@/lib/dates";

export async function GET(req: Request) {
  const origin = appOrigin(req);

  if (isDemo()) {
    // `?as=2` entra como el segundo atleta demo (solo existe en modo demo): sirve para probar el vínculo con dos sesiones.
    const id = new URL(req.url).searchParams.get("as") === "2" ? DEMO_PARTNER_ID : DEMO_ATHLETE_ID;
    const store = await getStore();
    if (!(await store.getAthlete(id))) {
      await store.upsertAthlete({
        id,
        name: id === DEMO_PARTNER_ID ? "Hermano demo" : "Atleta demo",
        avatar: null,
        accessTokenEnc: "",
        refreshTokenEnc: "",
        expiresAt: 0,
        syncedAt: null,
      });
      for (const g of demoGoals(todayLocal())) await store.createGoal(id, g);
    }
    await createSession(id);
    return NextResponse.redirect(`${origin}/`);
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(`${origin}/api/auth/callback`, state));
  res.cookies.set("sg_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}
