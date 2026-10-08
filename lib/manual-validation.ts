import { addDays } from "./dates";
import type { Validation } from "./goal-validation";
import { ALL_SPORTS, type ManualInput, type Sport } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Ventana que la app carga: una manual más antigua no se vería nunca. */
export const MANUAL_WINDOW_DAYS = 400;
export const MANUAL_LIMIT = 500;
export const DEFAULT_MANUAL_NAME = "Actividad manual";

export const MAX_DISTANCE_M = 1_000_000; // 1.000 km
export const MAX_TIME_S = 48 * 3600;
export const MAX_ELEVATION_M = 20_000;

const isRealDate = (v: unknown): v is string =>
  typeof v === "string" && DATE_RE.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

/**
 * Valida una actividad manual. `today` es la fecha del servidor (`YYYY-MM-DD`); se tolera un día más
 * por si la persona está en una zona horaria por delante.
 */
export function validateManual(input: unknown, today: string): Validation<ManualInput> {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Cuerpo inválido" };
  const o = input as Record<string, unknown>;

  if (!ALL_SPORTS.includes(o.sport as Sport)) return { ok: false, error: "Elige un deporte" };

  if (!isRealDate(o.date)) return { ok: false, error: "Fecha inválida" };
  if (o.date > addDays(today, 1)) return { ok: false, error: "La fecha no puede ser futura" };
  if (o.date < addDays(today, -MANUAL_WINDOW_DAYS)) {
    return { ok: false, error: `Solo se pueden agregar actividades de los últimos ${MANUAL_WINDOW_DAYS} días` };
  }

  const distance = Number(o.distance);
  if (!Number.isFinite(distance) || distance <= 0) return { ok: false, error: "La distancia debe ser mayor que cero" };
  if (distance > MAX_DISTANCE_M) return { ok: false, error: "La distancia es demasiado grande (máximo 1.000 km)" };

  const movingTime = o.movingTime === undefined || o.movingTime === null || o.movingTime === "" ? 0 : Number(o.movingTime);
  if (!Number.isFinite(movingTime) || movingTime < 0 || movingTime > MAX_TIME_S) {
    return { ok: false, error: "El tiempo debe estar entre 0 y 48 horas" };
  }

  const elevation = o.elevation === undefined || o.elevation === null || o.elevation === "" ? 0 : Number(o.elevation);
  if (!Number.isFinite(elevation) || elevation < 0 || elevation > MAX_ELEVATION_M) {
    return { ok: false, error: "El desnivel debe estar entre 0 y 20.000 m" };
  }

  const rawName = typeof o.name === "string" ? o.name.trim() : "";
  if (rawName.length > 80) return { ok: false, error: "El nombre puede tener hasta 80 caracteres" };

  return {
    ok: true,
    value: {
      sport: o.sport as Sport,
      date: o.date,
      distance,
      movingTime: Math.round(movingTime),
      elevation,
      name: rawName || DEFAULT_MANUAL_NAME,
    },
  };
}
