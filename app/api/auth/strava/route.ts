import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { DEMO_ATHLETE_ID } from "@/lib/server/demo";
import { appOrigin, isDemo } from "@/lib/server/env";
import { createSession } from "@/lib/server/session";
import { authorizeUrl } from "@/lib/server/strava";
import { getStore } from "@/lib/server/store";
import { demoGoals } from "@/lib/server/demo";
import { todayLocal } from "@/lib/dates";

export async function GET(req: Request) {
  const origin = appOrigin(req);

  if (isDemo()) {
    const store = await getStore();
    if (!(await store.getAthlete(DEMO_ATHLETE_ID))) {
      await store.upsertAthlete({
        id: DEMO_ATHLETE_ID,
        name: "Atleta demo",
        avatar: null,
        accessTokenEnc: "",
        refreshTokenEnc: "",
        expiresAt: 0,
        syncedAt: null,
      });
      for (const g of demoGoals(todayLocal())) await store.createGoal(DEMO_ATHLETE_ID, g);
    }
    await createSession(DEMO_ATHLETE_ID);
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
