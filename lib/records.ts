import { addDays, diffDays, endOfMonth, formatDate, startOfWeek } from "./dates";
import type { Activity, Settings, Sport } from "./types";

/** Racha actual: días seguidos con actividad hasta hoy; si hoy aún no hay salida, cuenta hasta ayer. */
export function currentStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export interface BestWeek {
  weekStart: string;
  distance: number;
  count: number;
}

/** Semana (por inicio de semana) con más distancia total. */
export function bestWeek(activities: Activity[], weekStart: Settings["weekStart"]): BestWeek | null {
  const weeks = new Map<string, BestWeek>();
  for (const a of activities) {
    const key = startOfWeek(a.date, weekStart);
    const w = weeks.get(key) ?? { weekStart: key, distance: 0, count: 0 };
    w.distance += a.distance;
    w.count += 1;
    weeks.set(key, w);
  }
  let best: BestWeek | null = null;
  for (const w of weeks.values()) if (!best || w.distance > best.distance) best = w;
  return best;
}

/** La salida más larga de cada deporte que aparezca en los datos. */
export function longestBySport(activities: Activity[]): Partial<Record<Sport, Activity>> {
  const out: Partial<Record<Sport, Activity>> = {};
  for (const a of activities) {
    const cur = out[a.sport];
    if (!cur || a.distance > cur.distance) out[a.sport] = a;
  }
  return out;
}

/** Salidas de correr de al menos `minDistance` m con el mejor ritmo medio (mayor velocidad). */
export function bestPace(activities: Activity[], minDistance = 5000): Activity | null {
  let best: Activity | null = null;
  for (const a of activities) {
    if (a.sport !== "run" || a.distance < minDistance || a.avgSpeed <= 0) continue;
    if (!best || a.avgSpeed > best.avgSpeed) best = a;
  }
  return best;
}

export interface Totals {
  distance: number;
  movingTime: number;
  count: number;
}

export function totalsBetween(activities: Activity[], from: string, to: string): Totals {
  const t: Totals = { distance: 0, movingTime: 0, count: 0 };
  for (const a of activities) {
    if (a.date < from || a.date > to) continue;
    t.distance += a.distance;
    t.movingTime += a.movingTime;
    t.count += 1;
  }
  return t;
}

/** Variación porcentual; `null` si no hay base con la que comparar. */
export function pctChange(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export interface Comparison {
  current: Totals;
  previous: Totals;
  /** Variación de distancia frente al periodo anterior al mismo punto; `null` si el anterior fue 0. */
  distancePct: number | null;
}

function compare(activities: Activity[], cur: [string, string], prev: [string, string]): Comparison {
  const current = totalsBetween(activities, cur[0], cur[1]);
  const previous = totalsBetween(activities, prev[0], prev[1]);
  return { current, previous, distancePct: pctChange(current.distance, previous.distance) };
}

/** Esta semana hasta hoy frente a la anterior hasta el mismo día de la semana (comparación justa). */
export function compareWeek(activities: Activity[], today: string, weekStart: Settings["weekStart"]): Comparison {
  const start = startOfWeek(today, weekStart);
  const offset = diffDays(start, today);
  const prevStart = addDays(start, -7);
  return compare(activities, [start, today], [prevStart, addDays(prevStart, offset)]);
}

/** Este mes hasta hoy frente al mes anterior hasta el mismo día del mes (acotado a su último día). */
export function compareMonth(activities: Activity[], today: string): Comparison {
  const [y, m, d] = today.split("-").map(Number);
  const start = `${today.slice(0, 7)}-01`;
  const prevStart = formatDate(Date.UTC(y, m - 2, 1));
  const prevEndCap = endOfMonth(prevStart);
  const prevEnd = addDays(prevStart, d - 1);
  return compare(activities, [start, today], [prevStart, prevEnd < prevEndCap ? prevEnd : prevEndCap]);
}
