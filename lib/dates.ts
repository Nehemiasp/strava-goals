/** Todas las fechas de la app son `YYYY-MM-DD` locales; se operan en UTC para evitar desfases de zona horaria. */

const DAY_MS = 86_400_000;

export function parseDate(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function addDays(d: string, n: number): string {
  return formatDate(parseDate(d) + n * DAY_MS);
}

/** Días entre dos fechas (b − a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b) - parseDate(a)) / DAY_MS);
}

/** Fecha local del dispositivo como `YYYY-MM-DD`. */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** 0 = lunes … 6 = domingo. */
export function weekday(d: string): number {
  return (new Date(parseDate(d)).getUTCDay() + 6) % 7;
}

export function startOfWeek(d: string, weekStart: "mon" | "sun" = "mon"): string {
  const offset = weekStart === "mon" ? weekday(d) : (weekday(d) + 1) % 7;
  return addDays(d, -offset);
}

export function endOfMonth(d: string): string {
  const [y, m] = d.split("-").map(Number);
  return formatDate(Date.UTC(y, m, 0));
}

export function periodRange(
  period: "week" | "month" | "year",
  today: string,
  weekStart: "mon" | "sun" = "mon",
): { startDate: string; endDate: string } {
  if (period === "week") {
    const start = startOfWeek(today, weekStart);
    return { startDate: start, endDate: addDays(start, 6) };
  }
  if (period === "month") {
    return { startDate: `${today.slice(0, 7)}-01`, endDate: endOfMonth(today) };
  }
  const y = today.slice(0, 4);
  return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
}
