import "server-only";
import { addDays, todayLocal } from "../dates";
import type { Activity } from "../types";
import { decrypt, encrypt } from "./crypto";
import { DEMO_ATHLETE_ID, demoActivities } from "./demo";
import { isDemo } from "./env";
import { fetchActivities, refreshToken, StravaError } from "./strava";
import { getStore, type AthleteRow } from "./store";

const SYNC_TTL_MS = 10 * 60 * 1000;
const FIRST_SYNC_DAYS = 400;
const RESYNC_DAYS = 35;

export class ReauthRequired extends Error {}

async function validAccessToken(row: AthleteRow): Promise<string> {
  const store = await getStore();
  if (row.expiresAt - 60 > Date.now() / 1000) return decrypt(row.accessTokenEnc);
  try {
    const t = await refreshToken(decrypt(row.refreshTokenEnc));
    await store.upsertAthlete({
      ...row,
      accessTokenEnc: encrypt(t.access_token),
      refreshTokenEnc: encrypt(t.refresh_token),
      expiresAt: t.expires_at,
    });
    return t.access_token;
  } catch (e) {
    if (e instanceof StravaError && (e.status === 400 || e.status === 401)) throw new ReauthRequired();
    throw e;
  }
}

export interface ActivitiesResult {
  activities: Activity[];
  /** `true` si Strava no respondió y se devuelve la caché. */
  stale: boolean;
  syncedAt: string | null;
}

/**
 * Devuelve las actividades del atleta (últimos ~400 días). Sincroniza con Strava como máximo cada 10 minutos
 * para no agotar el límite de la API (200 lecturas / 15 min, 2000 / día en nivel estándar).
 */
export async function getActivities(athleteId: number, force = false): Promise<ActivitiesResult> {
  const today = todayLocal();
  const since = addDays(today, -FIRST_SYNC_DAYS);

  if (isDemo() && athleteId === DEMO_ATHLETE_ID) {
    return { activities: demoActivities(today), stale: false, syncedAt: new Date().toISOString() };
  }

  const store = await getStore();
  const row = await store.getAthlete(athleteId);
  if (!row) throw new ReauthRequired();

  const fresh = row.syncedAt && Date.now() - new Date(row.syncedAt).getTime() < SYNC_TTL_MS;
  if (fresh && !force) {
    return { activities: await store.listActivities(athleteId, since), stale: false, syncedAt: row.syncedAt };
  }

  try {
    const token = await validAccessToken(row);
    const windowDays = row.syncedAt ? RESYNC_DAYS : FIRST_SYNC_DAYS;
    const from = addDays(today, -windowDays);
    const afterEpoch = Math.floor(new Date(`${from}T00:00:00Z`).getTime() / 1000) - 86_400;
    const incoming = await fetchActivities(token, afterEpoch);
    await store.syncActivities(athleteId, from, incoming);
    const at = new Date().toISOString();
    await store.setSynced(athleteId, at);
    return { activities: await store.listActivities(athleteId, since), stale: false, syncedAt: at };
  } catch (e) {
    if (e instanceof ReauthRequired) throw e;
    if (e instanceof StravaError && e.status === 401) throw new ReauthRequired();
    // 429 u otro fallo transitorio: servimos lo que hay en caché.
    return { activities: await store.listActivities(athleteId, since), stale: true, syncedAt: row.syncedAt };
  }
}
