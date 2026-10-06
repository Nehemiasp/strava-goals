import { describe, expect, it } from "vitest";
import { buildBrief, DEFAULT_BRIEF_OPTIONS, estimateTokens, weeklySummary } from "@/lib/export-brief";
import { DEFAULT_SETTINGS, type Activity, type Goal } from "@/lib/types";

const act = (id: number, date: string, over: Partial<Activity> = {}): Activity => ({
  id,
  name: "Rodaje por Parque Secreto",
  sport: "run",
  sportType: "Run",
  date,
  startedAt: `${date}T12:00:00Z`,
  distance: 8_100,
  movingTime: 2530,
  elevation: 86,
  avgSpeed: 3.2,
  avgHr: 151,
  polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
  ...over,
});

const goal: Goal = {
  id: "g",
  title: "100 km en octubre",
  metric: "distance",
  sports: ["run"],
  target: 100_000,
  period: "month",
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  status: "active",
  createdAt: "2026-10-01T00:00:00Z",
};

const acts = [act(1, "2026-10-05"), act(2, "2026-10-02", { sport: "ride", distance: 54_000, avgSpeed: 7.5, avgHr: null }), act(3, "2026-06-01")];

describe("buildBrief", () => {
  it("no incluye títulos ni rutas por defecto", () => {
    const b = buildBrief(acts, [goal], DEFAULT_BRIEF_OPTIONS, DEFAULT_SETTINGS, "2026-10-06");
    expect(b.text).not.toContain("Parque Secreto");
    expect(b.text).not.toContain("_p~iF");
    expect(b.text).toContain("100 km en octubre");
  });

  it("filtra por rango y deporte", () => {
    const b = buildBrief(acts, [], { ...DEFAULT_BRIEF_OPTIONS, rangeDays: 30, sports: ["run"] }, DEFAULT_SETTINGS, "2026-10-06");
    expect(b.activityCount).toBe(1);
  });

  it("incluye títulos solo si se piden", () => {
    const b = buildBrief(acts, [], { ...DEFAULT_BRIEF_OPTIONS, includeTitles: true }, DEFAULT_SETTINGS, "2026-10-06");
    expect(b.text).toContain("Parque Secreto");
  });

  it("omite FC cuando se desactiva", () => {
    const b = buildBrief(acts, [], { ...DEFAULT_BRIEF_OPTIONS, includeHr: false }, DEFAULT_SETTINGS, "2026-10-06");
    expect(b.text).not.toContain("FC media");
    expect(b.text).not.toContain("151");
  });

  it("genera JSON válido", () => {
    const b = buildBrief(acts, [goal], { ...DEFAULT_BRIEF_OPTIONS, format: "json" }, DEFAULT_SETTINGS, "2026-10-06");
    const parsed = JSON.parse(b.text);
    expect(parsed.actividades).toHaveLength(2);
    expect(parsed.goals[0].titulo).toBe("100 km en octubre");
    expect(b.filename).toMatch(/\.json$/);
  });

  it("estima tokens de forma proporcional al texto", () => {
    expect(estimateTokens("a".repeat(350))).toBe(100);
  });
});

describe("weeklySummary", () => {
  it("agrupa por semana (lunes) y separa correr de bici", () => {
    const sameWeek = [act(1, "2026-10-05"), act(2, "2026-10-08", { sport: "ride", distance: 54_000 })];
    const w = weeklySummary(sameWeek, "mon");
    expect(w).toHaveLength(1);
    expect(w[0].weekStart).toBe("2026-10-05");
    expect(w[0].runM).toBe(8_100);
    expect(w[0].rideM).toBe(54_000);
    expect(w[0].count).toBe(2);
  });

  it("separa semanas distintas, la más reciente primero", () => {
    const w = weeklySummary([act(1, "2026-10-05"), act(2, "2026-10-02")], "mon");
    expect(w.map((r) => r.weekStart)).toEqual(["2026-10-05", "2026-09-28"]);
  });

  it("respeta el domingo como inicio de semana", () => {
    const w = weeklySummary([act(1, "2026-10-04"), act(2, "2026-10-05")], "sun");
    expect(w).toHaveLength(1);
    expect(w[0].weekStart).toBe("2026-10-04");
  });
});

import { migrateBriefOptions } from "@/lib/export-brief";
import { formatPaceOrSpeed, sportsLabel } from "@/lib/format";

describe("caminar en el brief", () => {
  const walk = act(9, "2026-10-04", { sport: "walk", sportType: "Walk", distance: 5_000, avgSpeed: 1.4, avgHr: 110 });
  it("incluye columna y filas de Caminar solo si el deporte está seleccionado", () => {
    const all = buildBrief([...acts, walk], [], DEFAULT_BRIEF_OPTIONS, DEFAULT_SETTINGS, "2026-10-06");
    expect(all.text).toContain("Caminar (km)");
    expect(all.text).toMatch(/\| 4 oct \| Caminar \|/);
    const only = buildBrief([...acts, walk], [], { ...DEFAULT_BRIEF_OPTIONS, sports: ["run", "ride"] }, DEFAULT_SETTINGS, "2026-10-06");
    expect(only.text).not.toContain("Caminar");
  });
  it("el JSON lleva `caminar` en el resumen semanal", () => {
    const b = buildBrief([walk], [], { ...DEFAULT_BRIEF_OPTIONS, format: "json", sports: ["walk"] }, DEFAULT_SETTINGS, "2026-10-06");
    const json = JSON.parse(b.text);
    expect(json.resumen_semanal[0].caminar).toBe("5,0 km");
    expect(json.resumen_semanal[0].correr).toBeUndefined();
    expect(json.periodo.deportes).toEqual(["Caminar"]);
  });
  it("caminar usa ritmo (min/km) como Strava, la bici velocidad", () => {
    expect(formatPaceOrSpeed("walk", 1.4, "metric")).toBe("11:54 /km");
    expect(formatPaceOrSpeed("ride", 7.5, "metric")).toBe("27 km/h");
  });
  it("une los nombres de deportes", () => {
    expect(sportsLabel(["run"])).toBe("Correr");
    expect(sportsLabel(["run", "walk"])).toBe("Correr y Caminar");
    expect(sportsLabel(["run", "ride", "walk"])).toBe("Correr, Bici y Caminar");
  });
});

describe("migrateBriefOptions (valores guardados por versiones anteriores)", () => {
  it("convierte el `sport` antiguo", () => {
    expect(migrateBriefOptions({ sport: "run", rangeDays: 30 })).toEqual({ rangeDays: 30, sports: ["run"] });
    expect(migrateBriefOptions({ sport: "all" })).toEqual({ sports: ["run", "ride"] });
  });
  it("respeta `sports` actual y descarta basura", () => {
    expect(migrateBriefOptions({ sports: ["walk", "run"] })).toEqual({ sports: ["run", "walk"] });
    expect(migrateBriefOptions({ sports: ["swim"], sport: "ride" })).toEqual({ sports: ["ride"] });
    expect(migrateBriefOptions(null)).toEqual({});
  });
});
