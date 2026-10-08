import type { Activity, ManualActivity } from "./types";

/** Las manuales usan el id de su fila en negativo para no chocar con los ids de Strava. */
export const isManual = (a: Pick<Activity, "source">) => a.source === "manual";
export const manualRowId = (a: Pick<Activity, "id">) => -a.id;

/** Convierte una actividad manual a la forma común. Sin tiempo no hay ritmo: `avgSpeed` queda en 0. */
export function toActivity(m: ManualActivity): Activity {
  return {
    id: -m.id,
    name: m.name,
    sport: m.sport,
    sportType: "Manual",
    date: m.date,
    // Mediodía UTC: orden estable dentro del día y sin depender de la zona horaria.
    startedAt: `${m.date}T12:00:00Z`,
    distance: m.distance,
    movingTime: m.movingTime,
    elevation: m.elevation,
    avgSpeed: m.movingTime > 0 ? m.distance / m.movingTime : 0,
    avgHr: null,
    polyline: null,
    source: "manual",
  };
}
