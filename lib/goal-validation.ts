import type { GoalMetric, GoalPeriod, GoalSport, NewGoal } from "./types";

const METRICS: GoalMetric[] = ["distance", "time", "elevation", "count", "streak"];
const SPORTS: GoalSport[] = ["run", "ride", "both"];
const PERIODS: GoalPeriod[] = ["week", "month", "year", "custom"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isDate = (v: unknown): v is string =>
  typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

export const MAX_TARGET: Record<GoalMetric, number> = {
  distance: 100_000_000, // 100.000 km
  time: 86_400 * 366,
  elevation: 1_000_000,
  count: 1000,
  streak: 366,
};

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateNewGoal(input: unknown): Validation<NewGoal> {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Cuerpo inválido" };
  const o = input as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (title.length < 1 || title.length > 80) return { ok: false, error: "El título debe tener entre 1 y 80 caracteres" };
  if (!METRICS.includes(o.metric as GoalMetric)) return { ok: false, error: "Métrica inválida" };
  if (!SPORTS.includes(o.sport as GoalSport)) return { ok: false, error: "Deporte inválido" };
  if (!PERIODS.includes(o.period as GoalPeriod)) return { ok: false, error: "Periodo inválido" };
  const metric = o.metric as GoalMetric;
  const target = Number(o.target);
  if (!Number.isFinite(target) || target <= 0) return { ok: false, error: "El objetivo debe ser mayor que cero" };
  if (target > MAX_TARGET[metric]) return { ok: false, error: "El objetivo es demasiado grande" };
  if (!isDate(o.startDate) || !isDate(o.endDate)) return { ok: false, error: "Fechas inválidas" };
  if (o.endDate < o.startDate) return { ok: false, error: "La fecha final debe ser posterior a la inicial" };
  const days = (Date.parse(`${o.endDate}T00:00:00Z`) - Date.parse(`${o.startDate}T00:00:00Z`)) / 86_400_000 + 1;
  if (days > 366) return { ok: false, error: "El periodo no puede superar un año" };
  if (metric === "streak" && target > days) return { ok: false, error: "La racha no puede ser más larga que el periodo" };
  return {
    ok: true,
    value: {
      title,
      metric,
      sport: o.sport as GoalSport,
      target,
      period: o.period as GoalPeriod,
      startDate: o.startDate,
      endDate: o.endDate,
    },
  };
}

export function validateGoalPatch(
  input: unknown,
): Validation<{ title?: string; target?: number; status?: "active" | "archived" }> {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Cuerpo inválido" };
  const o = input as Record<string, unknown>;
  const out: { title?: string; target?: number; status?: "active" | "archived" } = {};
  if (o.title !== undefined) {
    const t = typeof o.title === "string" ? o.title.trim() : "";
    if (t.length < 1 || t.length > 80) return { ok: false, error: "El título debe tener entre 1 y 80 caracteres" };
    out.title = t;
  }
  if (o.target !== undefined) {
    const n = Number(o.target);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "El objetivo debe ser mayor que cero" };
    out.target = n;
  }
  if (o.status !== undefined) {
    if (o.status !== "active" && o.status !== "archived") return { ok: false, error: "Estado inválido" };
    out.status = o.status;
  }
  if (Object.keys(out).length === 0) return { ok: false, error: "Nada que actualizar" };
  return { ok: true, value: out };
}
