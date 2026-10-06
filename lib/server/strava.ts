import "server-only";
import type { Activity, Sport } from "../types";
import { required } from "./env";

const API = "https://www.strava.com/api/v3";
const OAUTH = "https://www.strava.com/oauth";

export class StravaError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const RIDE_TYPES = new Set(["Ride", "GravelRide", "MountainBikeRide", "EBikeRide", "EMountainBikeRide", "VirtualRide"]);

export function sportOf(type: string): Sport | null {
  if (RUN_TYPES.has(type)) return "run";
  if (RIDE_TYPES.has(type)) return "ride";
  return null;
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: required("STRAVA_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });
  return `${OAUTH}/authorize?${p}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string; profile?: string };
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("STRAVA_CLIENT_ID"),
      client_secret: required("STRAVA_CLIENT_SECRET"),
      ...body,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new StravaError(res.status, `Strava rechazó el token (${res.status})`);
  return res.json();
}

export const exchangeCode = (code: string) => tokenRequest({ code, grant_type: "authorization_code" });
export const refreshToken = (refresh: string) =>
  tokenRequest({ refresh_token: refresh, grant_type: "refresh_token" });

export async function deauthorize(accessToken: string): Promise<void> {
  await fetch(`${OAUTH}/deauthorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ access_token: accessToken }),
    cache: "no-store",
  }).catch(() => undefined);
}

interface RawActivity {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate?: number;
  map?: { summary_polyline?: string | null };
}

export function mapActivity(a: RawActivity): Activity | null {
  const sportType = a.sport_type ?? a.type;
  const sport = sportOf(sportType);
  if (!sport) return null;
  return {
    id: a.id,
    name: a.name,
    sport,
    sportType,
    date: a.start_date_local.slice(0, 10),
    startedAt: a.start_date,
    distance: a.distance ?? 0,
    movingTime: a.moving_time ?? 0,
    elevation: a.total_elevation_gain ?? 0,
    avgSpeed: a.average_speed ?? 0,
    avgHr: a.average_heartrate ?? null,
    polyline: a.map?.summary_polyline || null,
  };
}

/** Descarga actividades de correr y bici posteriores a `afterEpoch` (segundos). Máximo 5 páginas de 200. */
export async function fetchActivities(accessToken: string, afterEpoch: number): Promise<Activity[]> {
  const out: Activity[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${API}/athlete/activities?after=${afterEpoch}&per_page=200&page=${page}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) throw new StravaError(res.status, `Strava respondió ${res.status}`);
    const batch: RawActivity[] = await res.json();
    for (const raw of batch) {
      const mapped = mapActivity(raw);
      if (mapped) out.push(mapped);
    }
    if (batch.length < 200) break;
  }
  return out;
}
