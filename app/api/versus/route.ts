import { addDays, todayLocal } from "@/lib/dates";
import { fail, json, requireAthlete } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { getActivities, listManualSafe, ReauthRequired } from "@/lib/server/sync";
import type { Activity, PartnerInfo, SharedDay } from "@/lib/types";
import { toSharedDays } from "@/lib/versus";

/** Días de historial que se comparten con la persona vinculada. */
const SHARED_DAYS = 120;

/**
 * Datos de la persona vinculada para el reto. Solo responde si existe un vínculo aceptado por ambos y
 * devuelve ÚNICAMENTE totales por día y deporte (`SharedDay`): nunca ids, títulos, rutas, FC ni horas.
 */
export async function GET() {
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  const store = await getStore();
  const link = await store.getLink(id).catch(() => null);
  if (!link) return fail(403, "No tienes un vínculo activo");

  const since = addDays(todayLocal(), -SHARED_DAYS);
  let activities: Activity[];
  let stale = false;
  let syncedAt: string | null = null;
  try {
    const r = await getActivities(link.id);
    activities = r.activities;
    stale = r.stale;
    syncedAt = r.syncedAt;
  } catch (e) {
    if (!(e instanceof ReauthRequired)) return fail(502, "No se pudieron cargar los datos");
    // Su sesión de Strava caducó: se muestra lo último guardado y se avisa.
    // Lo agregado a mano también cuenta en el reto, igual que en el camino normal.
    activities = [...(await store.listActivities(link.id, since)), ...(await listManualSafe(link.id, since)).activities];
    stale = true;
  }

  const days: SharedDay[] = toSharedDays(activities.filter((a) => a.date >= since));
  const partner: PartnerInfo = { name: link.name, avatar: link.avatar };
  return json({ partner, days, stale, syncedAt });
}
