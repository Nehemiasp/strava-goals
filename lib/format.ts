import { addDays, diffDays, parseDate } from "./dates";
import type { GoalMetric, Settings, Sport } from "./types";

type Units = Settings["units"];

const KM_PER_MILE = 1.609344;
const FT_PER_M = 3.28084;
const LOCALE = "es";

const nf = (min: number, max: number) =>
  new Intl.NumberFormat(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max });
const nf0 = nf(0, 0);
const nf1 = nf(0, 1);
const nf1fixed = nf(1, 1);
const nf2 = nf(0, 2);

export function metersToDisplay(m: number, units: Units): number {
  return units === "metric" ? m / 1000 : m / 1000 / KM_PER_MILE;
}

export function displayToMeters(v: number, units: Units): number {
  return units === "metric" ? v * 1000 : v * 1000 * KM_PER_MILE;
}

export const distanceUnit = (units: Units) => (units === "metric" ? "km" : "mi");
export const elevationUnit = (units: Units) => (units === "metric" ? "m" : "ft");

/** Distancia con un decimal fijo ("7,0"), para que las columnas de cifras sean consistentes. */
export function formatDistance(m: number, units: Units, digits = 1): string {
  const v = metersToDisplay(m, units);
  return (digits === 0 ? nf0 : digits === 2 ? nf2 : nf1fixed).format(v);
}

/** Distancia recortada ("100", "969,7"): para objetivos y metas, donde "100,0" sobra. */
function formatDistanceTrim(m: number, units: Units): string {
  return nf1.format(metersToDisplay(m, units));
}

export function formatElevation(m: number, units: Units): string {
  return nf0.format(units === "metric" ? m : m * FT_PER_M);
}

/** `h:mm:ss` o `m:ss` para duraciones de actividad. */
export function formatDuration(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const rr = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${rr}` : `${m}:${rr}`;
}

/** Horas con un decimal para metas de tiempo: `12,5`. */
export function formatHours(sec: number): string {
  return nf1.format(sec / 3600);
}

/** Ritmo `m:ss` por km/mi a partir de m/s. */
export function formatPace(speedMs: number, units: Units): string {
  if (!speedMs || speedMs <= 0) return "–";
  const secPerUnit = (units === "metric" ? 1000 : 1000 * KM_PER_MILE) / speedMs;
  const mm = Math.floor(secPerUnit / 60);
  const ss = Math.round(secPerUnit % 60);
  return ss === 60 ? `${mm + 1}:00` : `${mm}:${String(ss).padStart(2, "0")}`;
}

export function formatSpeed(speedMs: number, units: Units): string {
  const v = units === "metric" ? speedMs * 3.6 : (speedMs * 3.6) / KM_PER_MILE;
  return nf1.format(v);
}

/** Ritmo para correr y caminar (como Strava), velocidad para bici, con su unidad. */
export function formatPaceOrSpeed(sport: Sport, speedMs: number, units: Units): string {
  return sport !== "ride"
    ? `${formatPace(speedMs, units)} /${distanceUnit(units)}`
    : `${formatSpeed(speedMs, units)} ${distanceUnit(units)}/h`;
}

const SPORT_LABEL: Record<Sport, string> = { run: "Correr", ride: "Bici", walk: "Caminar" };
export const sportLabel = (s: Sport) => SPORT_LABEL[s];

/** "Correr", "Correr y Bici", "Correr, Bici y Caminar" (en el orden canónico). */
export function sportsLabel(sports: readonly Sport[]): string {
  const names = (["run", "ride", "walk"] as const).filter((s) => sports.includes(s)).map(sportLabel);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

/** Valor de una meta con su unidad, separados para poder componer StatBlock. */
export function formatMetric(
  metric: GoalMetric,
  base: number,
  units: Units,
): { value: string; unit: string } {
  switch (metric) {
    case "distance":
      return { value: formatDistanceTrim(base, units), unit: distanceUnit(units) };
    case "time":
      return { value: formatHours(base), unit: "h" };
    case "elevation":
      return { value: formatElevation(base, units), unit: elevationUnit(units) };
    case "count":
      return { value: nf0.format(Math.round(base)), unit: Math.round(base) === 1 ? "salida" : "salidas" };
    case "streak":
      return { value: nf0.format(Math.round(base)), unit: Math.round(base) === 1 ? "día" : "días" };
  }
}

export function formatMetricInline(metric: GoalMetric, base: number, units: Units): string {
  const { value, unit } = formatMetric(metric, base, units);
  return `${value} ${unit}`;
}

/** Diferencia con signo de magnitud ya redondeada: "6,2 km". */
export function formatDelta(metric: GoalMetric, absBase: number, units: Units): string {
  if (metric === "count" || metric === "streak") {
    const rounded = Math.max(1, Math.round(absBase));
    return formatMetricInline(metric, rounded, units);
  }
  return formatMetricInline(metric, absBase, units);
}

const dayFmt = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const shortFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/\.$/, "");

/** "Hoy", "Ayer", "Lun 5 oct". */
export function relativeDate(date: string, today: string): string {
  const d = diffDays(date, today);
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  return cap(dayFmt.format(parseDate(date)).replace(",", ""));
}

export const shortDate = (date: string) => shortFmt.format(parseDate(date)).replace(/\.$/, "");
export const longDate = (date: string) => longFmt.format(parseDate(date));

export function daysLabel(n: number): string {
  return `${n} ${n === 1 ? "día" : "días"}`;
}

export { addDays };

/** "ahora", "hace 5 min", "hace 3 h", "hace 2 días". */
export function agoLabel(iso: string, now: number = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

/** "+18 %" / "−5 %" (con el signo menos tipográfico). */
export function formatPct(pct: number): string {
  const n = Math.round(Math.abs(pct));
  return `${pct >= 0 ? "+" : "−"}${n} %`;
}
