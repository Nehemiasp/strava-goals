export type Sport = "run" | "ride";
export type SportFilter = Sport | "all";

/** Actividad reducida a lo que la app necesita. Unidades base: metros, segundos, m/s. */
export interface Activity {
  id: number;
  name: string;
  sport: Sport;
  sportType: string;
  /** Fecha local del atleta, `YYYY-MM-DD`. */
  date: string;
  /** Instante de inicio en ISO UTC. */
  startedAt: string;
  distance: number;
  movingTime: number;
  elevation: number;
  avgSpeed: number;
  avgHr: number | null;
  polyline: string | null;
}

export type GoalMetric = "distance" | "time" | "elevation" | "count" | "streak";
export type GoalSport = Sport | "both";
export type GoalPeriod = "week" | "month" | "year" | "custom";
export type GoalStatus = "active" | "archived";

/** Objetivo en unidades base: m, s, m, salidas, días. */
export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  sport: GoalSport;
  target: number;
  period: GoalPeriod;
  /** Inclusive, `YYYY-MM-DD`. */
  startDate: string;
  endDate: string;
  status: GoalStatus;
  createdAt: string;
}

export type NewGoal = Omit<Goal, "id" | "createdAt" | "status">;

export interface Settings {
  units: "metric" | "imperial";
  weekStart: "mon" | "sun";
  theme: "auto" | "light" | "dark";
  routeGlyphs: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  units: "metric",
  weekStart: "mon",
  theme: "auto",
  routeGlyphs: true,
};

export interface AthleteInfo {
  id: number;
  name: string;
  avatar: string | null;
  demo: boolean;
}
