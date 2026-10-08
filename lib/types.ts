export type Sport = "run" | "ride" | "walk";
export const ALL_SPORTS: readonly Sport[] = ["run", "ride", "walk"];
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
  /** Origen del dato. Ausente = Strava. Las manuales las agrega la persona y no traen FC ni ruta. */
  source?: "strava" | "manual";
}

export type GoalMetric = "distance" | "time" | "elevation" | "count" | "streak";
export type GoalPeriod = "week" | "month" | "year" | "custom";
export type GoalStatus = "active" | "archived";

/** Objetivo en unidades base: m, s, m, salidas, días. */
export interface Goal {
  id: string;
  title: string;
  metric: GoalMetric;
  /** Deportes que cuentan para el goal: no vacío, sin repetidos. */
  sports: Sport[];
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

/**
 * Lo único que se comparte con la persona vinculada: totales por día y deporte.
 * Nunca ids, títulos, rutas, frecuencia cardíaca ni horas.
 */
export interface SharedDay {
  date: string;
  sport: Sport;
  distance: number;
  movingTime: number;
  elevation: number;
  count: number;
}

export interface PartnerInfo {
  name: string;
  avatar: string | null;
}

export type VersusMetric = "distance" | "time" | "elevation" | "count";

/** Lo que la persona escribe al agregar una actividad a mano. Unidades base: metros, segundos. */
export interface ManualInput {
  sport: Sport;
  /** Fecha local, `YYYY-MM-DD`. */
  date: string;
  distance: number;
  /** 0 si no se sabe. */
  movingTime: number;
  elevation: number;
  name: string;
}

export interface ManualActivity extends ManualInput {
  /** Id de la fila en la base (positivo). En `Activity` se expone como `-id`. */
  id: number;
  createdAt: string;
}
