import { addDays, diffDays } from "./dates";
import type { Activity, Goal } from "./types";

export type ProgressState = "upcoming" | "ahead" | "onpace" | "behind" | "done" | "expired";

export interface Progress {
  state: ProgressState;
  /** Valor logrado en unidades base. */
  current: number;
  target: number;
  /** 0..1 (acotado). */
  ratio: number;
  /** Lo esperado a hoy si se avanzara de forma lineal. */
  expected: number;
  /** current − expected. Positivo = por delante. */
  delta: number;
  /** Proyección al cierre al ritmo actual. `null` si no aplica. */
  projected: number | null;
  /** Fracción del periodo transcurrida, 0..1. */
  elapsed: number;
  daysLeft: number;
  totalDays: number;
  /** Actividades que cuentan para el goal, de la más reciente a la más antigua. */
  activities: Activity[];
}

const TOLERANCE = 0.01;

export function activitiesForGoal(goal: Goal, activities: Activity[]): Activity[] {
  return activities
    .filter(
      (a) =>
        a.date >= goal.startDate &&
        a.date <= goal.endDate &&
        (goal.sport === "both" || a.sport === goal.sport),
    )
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
}

/** Racha más larga de días consecutivos con actividad. */
export function longestStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of unique) {
    run = prev !== null && diffDays(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

function currentValue(goal: Goal, list: Activity[]): number {
  switch (goal.metric) {
    case "distance":
      return list.reduce((s, a) => s + a.distance, 0);
    case "time":
      return list.reduce((s, a) => s + a.movingTime, 0);
    case "elevation":
      return list.reduce((s, a) => s + a.elevation, 0);
    case "count":
      return list.length;
    case "streak":
      return longestStreak(list.map((a) => a.date));
  }
}

export function computeProgress(goal: Goal, activities: Activity[], today: string): Progress {
  const list = activitiesForGoal(goal, activities);
  const current = currentValue(goal, list);
  const totalDays = diffDays(goal.startDate, goal.endDate) + 1;
  const daysElapsed = Math.min(totalDays, Math.max(0, diffDays(goal.startDate, today) + 1));
  const elapsed = daysElapsed / totalDays;
  const daysLeft = Math.max(0, diffDays(today, goal.endDate));
  const linear = goal.metric !== "streak";
  // En rachas no hay "ritmo lineal": solo importa llegar al objetivo dentro del periodo.
  const expected = linear ? goal.target * elapsed : current;
  const delta = current - expected;
  const ratio = Math.min(1, goal.target > 0 ? current / goal.target : 0);

  let state: ProgressState;
  if (current >= goal.target) state = "done";
  else if (today > goal.endDate) state = "expired";
  else if (today < goal.startDate) state = "upcoming";
  else if (delta > goal.target * TOLERANCE) state = "ahead";
  else if (delta >= -goal.target * TOLERANCE) state = "onpace";
  else state = "behind";

  const projected =
    linear && daysElapsed > 0 && today >= goal.startDate ? current / elapsed : null;

  return {
    state,
    current,
    target: goal.target,
    ratio,
    expected,
    delta,
    projected,
    elapsed,
    daysLeft,
    totalDays,
    activities: list,
  };
}

/** Puntos acumulados por día para el gráfico de tendencia del goal. */
export function cumulativeSeries(
  goal: Goal,
  activities: Activity[],
  today: string,
): { date: string; value: number; expected: number }[] {
  if (goal.metric === "streak") return [];
  const list = activitiesForGoal(goal, activities);
  const totalDays = diffDays(goal.startDate, goal.endDate) + 1;
  const last = today < goal.endDate ? today : goal.endDate;
  const upTo = diffDays(goal.startDate, last);
  const perDay = new Map<string, number>();
  for (const a of list) {
    const v =
      goal.metric === "distance"
        ? a.distance
        : goal.metric === "time"
          ? a.movingTime
          : goal.metric === "elevation"
            ? a.elevation
            : 1;
    perDay.set(a.date, (perDay.get(a.date) ?? 0) + v);
  }
  const out: { date: string; value: number; expected: number }[] = [];
  let acc = 0;
  for (let i = 0; i <= upTo; i++) {
    const d = addDays(goal.startDate, i);
    acc += perDay.get(d) ?? 0;
    out.push({ date: d, value: acc, expected: (goal.target * (i + 1)) / totalDays });
  }
  return out;
}
