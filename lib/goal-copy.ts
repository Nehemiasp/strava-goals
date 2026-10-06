import { diffDays } from "./dates";
import { daysLabel, displayToMeters, formatDelta, formatMetricInline, longDate, shortDate } from "./format";
import type { Progress } from "./goals-progress";
import type { Goal, GoalMetric, GoalSport, Settings } from "./types";

type Units = Settings["units"];

const sportAdverb = (s: GoalSport) => (s === "run" ? "corriendo" : s === "ride" ? "en bici" : "");
const sportInfinitive = (s: GoalSport) => (s === "run" ? "Correr" : s === "ride" ? "Rodar" : "Moverte");

/** Frase corta de estado para tarjetas: "Vas 6,2 km por delante". */
export function statusText(goal: Goal, p: Progress, units: Units): string {
  switch (p.state) {
    case "done":
      return "Cumplido";
    case "expired":
      return `Cerró en ${formatMetricInline(goal.metric, p.current, units)} de ${formatMetricInline(goal.metric, goal.target, units)}`;
    case "upcoming":
      return `Empieza el ${shortDate(goal.startDate)}`;
    case "ahead":
      return `Vas ${formatDelta(goal.metric, Math.abs(p.delta), units)} por delante`;
    case "behind":
      return `Vas ${formatDelta(goal.metric, Math.abs(p.delta), units)} por detrás`;
    case "onpace":
      return goal.metric === "streak" ? `Mejor racha: ${formatMetricInline("streak", p.current, units)}` : "Vas al día";
  }
}

export function timeLeftText(goal: Goal, p: Progress, today: string): string {
  if (p.state === "done") return "Objetivo alcanzado";
  if (p.state === "expired") return `Terminó el ${shortDate(goal.endDate)}`;
  if (p.state === "upcoming") return `Faltan ${daysLabel(diffDays(today, goal.startDate))} para empezar`;
  if (p.daysLeft === 0) return "Último día";
  return `Quedan ${daysLabel(p.daysLeft)}`;
}

/** Cuánto hay que hacer por día para llegar. `null` si no aplica. */
export function requiredPerDay(goal: Goal, p: Progress): number | null {
  if (goal.metric === "streak" || goal.metric === "count") return null;
  if (p.state !== "ahead" && p.state !== "onpace" && p.state !== "behind") return null;
  const remaining = Math.max(0, goal.target - p.current);
  const daysIncludingToday = p.daysLeft + 1;
  return remaining / daysIncludingToday;
}

export function projectionText(goal: Goal, p: Progress, units: Units): string | null {
  if (p.projected === null || p.state === "done" || p.state === "expired" || p.state === "upcoming") return null;
  if (p.elapsed < 0.1) return null; // muy pronto para proyectar con sentido
  const v = formatMetricInline(goal.metric, p.projected, units);
  return `A este ritmo cerrarás en ${v}`;
}

const METRIC_PHRASE: Record<GoalMetric, (value: string) => string> = {
  distance: (v) => v,
  time: (v) => v,
  elevation: (v) => `${v} de desnivel`,
  count: (v) => v,
  streak: (v) => `${v} seguidos`,
};

const PERIOD_PHRASE: Record<Goal["period"], string> = {
  week: "esta semana",
  month: "este mes",
  year: "este año",
  custom: "",
};

/** Título sugerido: "100 km corriendo este mes". */
export function suggestTitle(
  g: Pick<Goal, "metric" | "sport" | "target" | "period">,
  units: Units,
): string {
  const value = formatMetricInline(g.metric, g.target, units);
  if (g.metric === "count") {
    const per = g.period === "week" ? " por semana" : g.period === "month" ? " al mes" : g.period === "year" ? " al año" : "";
    return [`${value}${per}`, sportAdverb(g.sport)].filter(Boolean).join(" ");
  }
  return [METRIC_PHRASE[g.metric](value), sportAdverb(g.sport), PERIOD_PHRASE[g.period]].filter(Boolean).join(" ");
}

/** Resumen antes de guardar: "Correr 100 km entre el 1 y el 31 de octubre". */
export function goalSentence(g: Pick<Goal, "metric" | "sport" | "target" | "startDate" | "endDate">, units: Units): string {
  const value = formatMetricInline(g.metric, g.target, units);
  const what =
    g.metric === "count"
      ? `${sportInfinitive(g.sport) === "Moverte" ? "Salir" : `Salir a ${g.sport === "run" ? "correr" : "rodar"}`} ${value}`
      : g.metric === "streak"
        ? `Entrenar ${value}`
        : g.metric === "time"
          ? `${sportInfinitive(g.sport)} ${value}`
          : g.metric === "elevation"
            ? `Acumular ${value} de desnivel${g.sport === "both" ? "" : g.sport === "run" ? " corriendo" : " en bici"}`
            : `${sportInfinitive(g.sport)} ${value}`;
  return `${what} entre el ${longDate(g.startDate)} y el ${longDate(g.endDate)}`;
}

/** Convierte lo que escribe la persona al valor base del goal. */
export function inputToBase(metric: GoalMetric, input: number, units: Units): number {
  switch (metric) {
    case "distance":
      return displayToMeters(input, units);
    case "time":
      return input * 3600;
    case "elevation":
      return units === "metric" ? input : input / 3.28084;
    default:
      return input;
  }
}

export function baseToInput(metric: GoalMetric, base: number, units: Units): number {
  switch (metric) {
    case "distance":
      return units === "metric" ? base / 1000 : base / 1000 / 1.609344;
    case "time":
      return base / 3600;
    case "elevation":
      return units === "metric" ? base : base * 3.28084;
    default:
      return base;
  }
}

export function inputUnitLabel(metric: GoalMetric, units: Units): string {
  switch (metric) {
    case "distance":
      return units === "metric" ? "km" : "mi";
    case "time":
      return "horas";
    case "elevation":
      return units === "metric" ? "m" : "ft";
    case "count":
      return "salidas";
    case "streak":
      return "días";
  }
}
