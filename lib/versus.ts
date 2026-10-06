import { addDays, diffDays, periodRange, startOfWeek } from "./dates";
import type { Activity, Settings, SharedDay, Sport, VersusMetric } from "./types";

/** Agrega actividades a totales por día y deporte. Es la ÚNICA forma en que se comparten datos. */
export function toSharedDays(activities: readonly Activity[]): SharedDay[] {
  const map = new Map<string, SharedDay>();
  for (const a of activities) {
    const key = `${a.date}|${a.sport}`;
    const d = map.get(key) ?? { date: a.date, sport: a.sport, distance: 0, movingTime: 0, elevation: 0, count: 0 };
    d.distance += a.distance;
    d.movingTime += a.movingTime;
    d.elevation += a.elevation;
    d.count += 1;
    map.set(key, d);
  }
  return [...map.values()].sort((x, y) => (x.date === y.date ? x.sport.localeCompare(y.sport) : x.date < y.date ? -1 : 1));
}

export interface Filter {
  sports: readonly Sport[];
  metric: VersusMetric;
}

function value(d: SharedDay, metric: VersusMetric): number {
  return metric === "distance" ? d.distance : metric === "time" ? d.movingTime : metric === "elevation" ? d.elevation : d.count;
}

/** Suma de la métrica en [from, to] (ambos inclusive) para los deportes elegidos. */
export function totals(days: readonly SharedDay[], f: Filter, from: string, to: string): number {
  let sum = 0;
  for (const d of days) if (d.date >= from && d.date <= to && f.sports.includes(d.sport)) sum += value(d, f.metric);
  return sum;
}

export interface Lead {
  leader: "me" | "them" | "tie";
  /** Diferencia absoluta en la unidad base de la métrica. */
  diff: number;
}

export function lead(mine: number, theirs: number): Lead {
  const diff = Math.abs(mine - theirs);
  return { leader: diff < 1e-9 ? "tie" : mine > theirs ? "me" : "them", diff };
}

/** Inicio y fin del periodo (semana o mes) que contiene `today`. */
export function windowFor(
  period: "week" | "month",
  today: string,
  weekStart: Settings["weekStart"],
): { from: string; to: string } {
  const r = periodRange(period, today, weekStart);
  return { from: r.startDate, to: r.endDate };
}

export interface CumulativePoint {
  date: string;
  mine: number;
  theirs: number;
}

/** Acumulado diario de ambos desde `from` hasta hoy (o el fin del periodo si ya pasó). */
export function cumulativeBoth(
  mine: readonly SharedDay[],
  theirs: readonly SharedDay[],
  f: Filter,
  from: string,
  to: string,
  today: string,
): CumulativePoint[] {
  const last = today < to ? today : to;
  const n = diffDays(from, last);
  if (n < 0) return [];
  const out: CumulativePoint[] = [];
  let a = 0;
  let b = 0;
  for (let i = 0; i <= n; i++) {
    const date = addDays(from, i);
    a += totals(mine, f, date, date);
    b += totals(theirs, f, date, date);
    out.push({ date, mine: a, theirs: b });
  }
  return out;
}

export interface WeeklyWins {
  mine: number;
  theirs: number;
  ties: number;
  weeks: { weekStart: string; mine: number; theirs: number }[];
}

/**
 * Quién ganó cada una de las últimas `weeks` semanas COMPLETAS (la actual no cuenta).
 * Una semana sin actividad de ninguno no suma para nadie.
 */
export function weeklyWins(
  mine: readonly SharedDay[],
  theirs: readonly SharedDay[],
  f: Filter,
  today: string,
  weekStart: Settings["weekStart"],
  weeks = 8,
): WeeklyWins {
  const current = startOfWeek(today, weekStart);
  const out: WeeklyWins = { mine: 0, theirs: 0, ties: 0, weeks: [] };
  for (let i = weeks; i >= 1; i--) {
    const start = addDays(current, -7 * i);
    const end = addDays(start, 6);
    const a = totals(mine, f, start, end);
    const b = totals(theirs, f, start, end);
    out.weeks.push({ weekStart: start, mine: a, theirs: b });
    if (a === 0 && b === 0) continue;
    const l = lead(a, b);
    if (l.leader === "me") out.mine++;
    else if (l.leader === "them") out.theirs++;
    else out.ties++;
  }
  return out;
}
