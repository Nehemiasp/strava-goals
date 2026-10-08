import { json, requireAthlete } from "@/lib/server/http";
import { getActivities, ReauthRequired } from "@/lib/server/sync";

/** Cuántas actividades por deporte conservan la polilínea (solo las que se dibujan como silueta). */
const POLYLINE_PER_SPORT = 10;

export async function GET(req: Request) {
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  try {
    const force = new URL(req.url).searchParams.get("refresh") === "1";
    const { activities, stale, syncedAt, manualAvailable } = await getActivities(id, force);
    const sorted = [...activities].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
    const seen = { run: 0, ride: 0, walk: 0 };
    const slim = sorted.map((a) => {
      const keep = seen[a.sport]++ < POLYLINE_PER_SPORT;
      return keep ? a : { ...a, polyline: null };
    });
    return json({ activities: slim, stale, syncedAt, manualAvailable });
  } catch (e) {
    if (e instanceof ReauthRequired) return json({ error: "Vuelve a conectar Strava", reauth: true }, 401);
    return json({ error: "No se pudieron cargar las actividades" }, 502);
  }
}
