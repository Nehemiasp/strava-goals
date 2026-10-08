import { addDays, startOfWeek } from "./dates";
import {
  distanceUnit,
  elevationUnit,
  formatDistance,
  formatDuration,
  formatElevation,
  formatMetricInline,
  formatPaceOrSpeed,
  longDate,
  shortDate,
  sportLabel,
  sportsLabel,
} from "./format";
import { computeProgress } from "./goals-progress";
import { isManual } from "./manual";
import { ALL_SPORTS, type Activity, type Goal, type Settings, type Sport } from "./types";

export type BriefFormat = "markdown" | "json";

export interface BriefOptions {
  rangeDays: 30 | 90 | 365;
  /** Deportes incluidos: no vacío, en orden canónico. */
  sports: Sport[];
  includeGoals: boolean;
  includeActivities: boolean;
  includeTitles: boolean;
  includeHr: boolean;
  format: BriefFormat;
  prompt: string;
}

export const DEFAULT_PROMPT =
  "Eres un entrenador de running y ciclismo. Analiza mi carga de las últimas semanas, compárala con mis goals y dime qué estoy haciendo bien, dónde hay riesgo de sobrecarga o estancamiento, y propón un plan concreto para las próximas 4 semanas. Si te falta información, pregúntamela antes de asumir.";

export const DEFAULT_BRIEF_OPTIONS: BriefOptions = {
  rangeDays: 90,
  sports: [...ALL_SPORTS],
  includeGoals: true,
  includeActivities: true,
  includeTitles: false,
  includeHr: true,
  format: "markdown",
  prompt: DEFAULT_PROMPT,
};

export interface Brief {
  text: string;
  tokens: number;
  activityCount: number;
  filename: string;
  mime: string;
}

interface WeekRow {
  weekStart: string;
  runM: number;
  rideM: number;
  walkM: number;
  count: number;
  elevation: number;
  movingTime: number;
}

export function weeklySummary(activities: Activity[], weekStart: "mon" | "sun"): WeekRow[] {
  const map = new Map<string, WeekRow>();
  for (const a of activities) {
    const key = startOfWeek(a.date, weekStart);
    const row = map.get(key) ?? { weekStart: key, runM: 0, rideM: 0, walkM: 0, count: 0, elevation: 0, movingTime: 0 };
    if (a.sport === "run") row.runM += a.distance;
    else if (a.sport === "ride") row.rideM += a.distance;
    else row.walkM += a.distance;
    row.count += 1;
    row.elevation += a.elevation;
    row.movingTime += a.movingTime;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
}

/** Aproximación de tokens para texto en español/tablas: ~3,5 caracteres por token. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3.5);

const SPORT_NOUN: Record<Sport, string> = { run: "correr", ride: "ciclismo", walk: "caminar" };
const sportWord = (sports: readonly Sport[]) => {
  const names = ALL_SPORTS.filter((s) => sports.includes(s)).map((s) => SPORT_NOUN[s]);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
};

/** Convierte opciones guardadas por versiones anteriores (`sport` único) al formato actual. */
export function migrateBriefOptions(raw: unknown): Partial<BriefOptions> {
  if (typeof raw !== "object" || raw === null) return {};
  const { sport, sports, ...rest } = raw as Record<string, unknown>;
  const valid = Array.isArray(sports) ? ALL_SPORTS.filter((s) => sports.includes(s)) : [];
  if (valid.length > 0) return { ...rest, sports: valid } as Partial<BriefOptions>;
  // Antes: "all" significaba correr + bici.
  if (sport === "run") return { ...rest, sports: ["run"] } as Partial<BriefOptions>;
  if (sport === "ride") return { ...rest, sports: ["ride"] } as Partial<BriefOptions>;
  if (sport === "all") return { ...rest, sports: ["run", "ride"] } as Partial<BriefOptions>;
  return rest as Partial<BriefOptions>;
}

export function buildBrief(
  activities: Activity[],
  goals: Goal[],
  options: BriefOptions,
  settings: Settings,
  today: string,
): Brief {
  const { units, weekStart } = settings;
  const from = addDays(today, -(options.rangeDays - 1));
  const inRange = activities
    .filter((a) => a.date >= from && a.date <= today && options.sports.includes(a.sport))
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  const activeGoals = options.includeGoals
    ? goals.filter((g) => g.status === "active" && g.endDate >= today).map((g) => ({ goal: g, p: computeProgress(g, activities, today) }))
    : [];
  const weeks = weeklySummary(inRange, weekStart);

  const filename = `strava-goals-${today}.${options.format === "json" ? "json" : "md"}`;
  const mime = options.format === "json" ? "application/json" : "text/markdown";

  let text: string;
  if (options.format === "json") {
    text = JSON.stringify(
      {
        instrucciones: options.prompt,
        periodo: { desde: from, hasta: today, deportes: options.sports.map(sportLabel) },
        unidades: { distancia: distanceUnit(units), desnivel: elevationUnit(units) },
        goals: activeGoals.map(({ goal, p }) => ({
          titulo: goal.title,
          metrica: goal.metric,
          deportes: goal.sports.map(sportLabel),
          desde: goal.startDate,
          hasta: goal.endDate,
          objetivo: formatMetricInline(goal.metric, goal.target, units),
          logrado: formatMetricInline(goal.metric, p.current, units),
          esperado_hoy: formatMetricInline(goal.metric, p.expected, units),
          estado: p.state,
        })),
        resumen_semanal: weeks.map((w) => ({
          semana: w.weekStart,
          ...(options.sports.includes("run") ? { correr: `${formatDistance(w.runM, units)} ${distanceUnit(units)}` } : {}),
          ...(options.sports.includes("ride") ? { bici: `${formatDistance(w.rideM, units)} ${distanceUnit(units)}` } : {}),
          ...(options.sports.includes("walk") ? { caminar: `${formatDistance(w.walkM, units)} ${distanceUnit(units)}` } : {}),
          salidas: w.count,
          desnivel: `${formatElevation(w.elevation, units)} ${elevationUnit(units)}`,
          tiempo: formatDuration(w.movingTime),
        })),
        actividades: options.includeActivities
          ? inRange.map((a) => ({
              fecha: a.date,
              deporte: sportLabel(a.sport),
              fuente: isManual(a) ? "manual" : "strava",
              ...(options.includeTitles ? { titulo: a.name } : {}),
              distancia: `${formatDistance(a.distance, units)} ${distanceUnit(units)}`,
              tiempo: formatDuration(a.movingTime),
              ritmo_o_velocidad: formatPaceOrSpeed(a.sport, a.avgSpeed, units),
              desnivel: `${formatElevation(a.elevation, units)} ${elevationUnit(units)}`,
              ...(options.includeHr && a.avgHr ? { fc_media: Math.round(a.avgHr) } : {}),
            }))
          : undefined,
      },
      null,
      2,
    );
  } else {
    const lines: string[] = [];
    lines.push("# Contexto", "");
    lines.push(
      `Practico ${sportWord(options.sports)} como aficionado. Estos son mis datos de Strava del ${longDate(from)} al ${longDate(today)}. Distancias en ${distanceUnit(units)}, desnivel en ${elevationUnit(units)}.`,
      "",
    );
    lines.push("# Instrucciones", "", options.prompt.trim(), "");

    if (options.includeGoals) {
      lines.push("# Goals activos", "");
      if (activeGoals.length === 0) lines.push("No tengo goals activos.");
      for (const { goal, p } of activeGoals) {
        const sport = sportsLabel(goal.sports).toLowerCase();
        lines.push(
          `- **${goal.title}** (${sport}, ${shortDate(goal.startDate)}–${shortDate(goal.endDate)}): objetivo ${formatMetricInline(goal.metric, goal.target, units)}; llevo ${formatMetricInline(goal.metric, p.current, units)}; esperado a hoy ${formatMetricInline(goal.metric, p.expected, units)}.`,
        );
      }
      lines.push("");
    }

    lines.push("# Resumen semanal", "");
    if (weeks.length === 0) {
      lines.push("Sin actividades en este periodo.", "");
    } else {
      const cols = ALL_SPORTS.filter((sp) => options.sports.includes(sp));
      const head = cols.map((sp) => `${sportLabel(sp)} (${distanceUnit(units)})`);
      lines.push(`| Semana del | ${head.join(" | ")} | Salidas | Desnivel (${elevationUnit(units)}) | Tiempo |`);
      lines.push(`|---|${cols.map(() => "---|").join("")}---|---|---|`);
      const dist = (w: WeekRow, sp: Sport) => formatDistance(sp === "run" ? w.runM : sp === "ride" ? w.rideM : w.walkM, units);
      for (const w of weeks) {
        lines.push(
          `| ${shortDate(w.weekStart)} | ${cols.map((sp) => dist(w, sp)).join(" | ")} | ${w.count} | ${formatElevation(w.elevation, units)} | ${formatDuration(w.movingTime)} |`,
        );
      }
      lines.push("");
    }

    if (options.includeActivities) {
      lines.push("# Actividades", "");
      if (inRange.length === 0) {
        lines.push("Sin actividades en este periodo.");
      } else {
        if (inRange.some(isManual)) {
          lines.push("«(manual)» = agregada a mano por la persona: sin frecuencia cardíaca ni ritmo medido por GPS.", "");
        }
        const hr = options.includeHr;
        const title = options.includeTitles;
        lines.push(
          `| Fecha | Deporte |${title ? " Título |" : ""} ${distanceUnit(units)} | Tiempo | Ritmo/Vel. | Desnivel (${elevationUnit(units)}) |${hr ? " FC media |" : ""}`,
        );
        lines.push(`|---|---|${title ? "---|" : ""}---|---|---|---|${hr ? "---|" : ""}`);
        for (const a of inRange) {
          lines.push(
            `| ${shortDate(a.date)} | ${sportLabel(a.sport)}${isManual(a) ? " (manual)" : ""} |${title ? ` ${a.name.replace(/\|/g, "/")} |` : ""} ${formatDistance(a.distance, units)} | ${formatDuration(a.movingTime)} | ${formatPaceOrSpeed(a.sport, a.avgSpeed, units)} | ${formatElevation(a.elevation, units)} |${hr ? ` ${a.avgHr ? Math.round(a.avgHr) : "–"} |` : ""}`,
          );
        }
      }
      lines.push("");
    }
    text = lines.join("\n").trimEnd() + "\n";
  }

  return {
    text,
    tokens: estimateTokens(text),
    activityCount: options.includeActivities ? inRange.length : 0,
    filename,
    mime,
  };
}

/** Atajos para abrir un chat nuevo. Solo se ofrecen si el texto cabe en un enlace razonable. */
export const MAX_DEEPLINK_CHARS = 6000;

export const CHAT_LINKS = [
  { id: "chatgpt", label: "ChatGPT", url: (q: string) => `https://chatgpt.com/?q=${encodeURIComponent(q)}` },
  { id: "claude", label: "Claude", url: (q: string) => `https://claude.ai/new?q=${encodeURIComponent(q)}` },
  { id: "gemini", label: "Gemini", url: () => "https://gemini.google.com/app" },
] as const;
