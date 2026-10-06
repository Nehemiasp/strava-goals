import { addDays, startOfWeek } from "../dates";
import { shortDate } from "../format";
import { computeProgress, type Progress } from "../goals-progress";
import type { Activity, Goal, Settings, Sport, SportFilter } from "../types";

export interface GoalWithProgress {
  goal: Goal;
  progress: Progress;
}

// Antes de que lleguen los datos `today` es "" y las pantallas ya evalúan sus selectores:
// con una fecha inválida `Intl` lanzaría una excepción, así que se devuelven resultados vacíos.
export function withProgress(goals: Goal[], activities: Activity[], today: string): GoalWithProgress[] {
  if (!today) return [];
  return goals.map((goal) => ({ goal, progress: computeProgress(goal, activities, today) }));
}

export const isLive = ({ goal, progress }: GoalWithProgress) =>
  goal.status === "active" && progress.state !== "done" && progress.state !== "expired";

/** Las últimas `n` actividades del tipo elegido, más recientes primero. */
export function latest(activities: Activity[], filter: SportFilter, n = 10): Activity[] {
  return activities
    .filter((a) => filter === "all" || a.sport === filter)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, n);
}

export function thisWeek(activities: Activity[], today: string, weekStart: Settings["weekStart"]) {
  if (!today) return { list: [], count: 0, run: 0, ride: 0, walk: 0, total: 0 };
  const start = startOfWeek(today, weekStart);
  const list = activities.filter((a) => a.date >= start && a.date <= today);
  const sum = (sport: Sport) => list.filter((a) => a.sport === sport).reduce((s, a) => s + a.distance, 0);
  const [run, ride, walk] = [sum("run"), sum("ride"), sum("walk")];
  return { list, count: list.length, run, ride, walk, total: run + ride + walk };
}

/** Distancia total por semana, de la más antigua a la actual. */
export function weeklyTrend(activities: Activity[], today: string, weekStart: Settings["weekStart"], weeks = 8) {
  if (!today) return [];
  const current = startOfWeek(today, weekStart);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(current, -7 * (weeks - 1 - i));
    const end = addDays(start, 6);
    const value = activities.filter((a) => a.date >= start && a.date <= end).reduce((s, a) => s + a.distance, 0);
    return { label: shortDate(start), value };
  });
}
