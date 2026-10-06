import { describe, expect, it } from "vitest";
import { cumulativeBoth, lead, toSharedDays, totals, weeklyWins, windowFor } from "@/lib/versus";
import type { Activity, SharedDay } from "@/lib/types";

let n = 0;
const act = (date: string, over: Partial<Activity> = {}): Activity => ({
  id: ++n,
  name: "Salida secreta con nombre",
  sport: "run",
  sportType: "Run",
  date,
  startedAt: `${date}T06:41:00Z`,
  distance: 10_000,
  movingTime: 3000,
  elevation: 50,
  avgSpeed: 3.3,
  avgHr: 150,
  polyline: "_p~iF~ps|U",
  ...over,
});
const day = (date: string, over: Partial<SharedDay> = {}): SharedDay => ({
  date,
  sport: "run",
  distance: 10_000,
  movingTime: 3000,
  elevation: 50,
  count: 1,
  ...over,
});
const ALL = ["run", "ride", "walk"] as const;
const DIST = { sports: ALL, metric: "distance" } as const;

describe("toSharedDays (privacidad)", () => {
  it("agrega por día y deporte", () => {
    const out = toSharedDays([act("2026-10-05", { distance: 5_000 }), act("2026-10-05", { distance: 7_000 }), act("2026-10-05", { sport: "walk", distance: 3_000 })]);
    expect(out).toEqual([
      { date: "2026-10-05", sport: "run", distance: 12_000, movingTime: 6000, elevation: 100, count: 2 },
      { date: "2026-10-05", sport: "walk", distance: 3_000, movingTime: 3000, elevation: 50, count: 1 },
    ]);
  });
  it("solo expone las claves permitidas: nada de títulos, ids, rutas, FC ni horas", () => {
    const out = toSharedDays([act("2026-10-05"), act("2026-10-06", { sport: "ride" })]);
    for (const d of out) {
      expect(Object.keys(d).sort()).toEqual(["count", "date", "distance", "elevation", "movingTime", "sport"]);
    }
    const text = JSON.stringify(out);
    expect(text).not.toContain("secreta");
    expect(text).not.toContain("_p~iF");
    expect(text).not.toContain("06:41");
    expect(text).not.toContain("150");
  });
});

describe("totals / lead", () => {
  const days = [day("2026-10-05"), day("2026-10-06", { sport: "ride", distance: 40_000, elevation: 300 }), day("2026-10-07", { sport: "walk", distance: 4_000 })];
  it("suma por rango, deportes y métrica", () => {
    expect(totals(days, DIST, "2026-10-05", "2026-10-07")).toBe(54_000);
    expect(totals(days, { sports: ["run", "walk"], metric: "distance" }, "2026-10-05", "2026-10-07")).toBe(14_000);
    expect(totals(days, { sports: ALL, metric: "elevation" }, "2026-10-05", "2026-10-07")).toBe(400);
    expect(totals(days, { sports: ALL, metric: "count" }, "2026-10-05", "2026-10-07")).toBe(3);
    expect(totals(days, { sports: ALL, metric: "time" }, "2026-10-06", "2026-10-06")).toBe(3000);
    expect(totals(days, DIST, "2026-10-08", "2026-10-09")).toBe(0);
  });
  it("lead", () => {
    expect(lead(10, 4)).toEqual({ leader: "me", diff: 6 });
    expect(lead(4, 10)).toEqual({ leader: "them", diff: 6 });
    expect(lead(5, 5)).toEqual({ leader: "tie", diff: 0 });
  });
});

describe("cumulativeBoth", () => {
  it("acumula día a día hasta hoy", () => {
    const mine = [day("2026-10-05", { distance: 5_000 }), day("2026-10-07", { distance: 3_000 })];
    const theirs = [day("2026-10-06", { distance: 8_000 })];
    const out = cumulativeBoth(mine, theirs, DIST, "2026-10-05", "2026-10-11", "2026-10-07");
    expect(out.map((p) => [p.mine, p.theirs])).toEqual([[5_000, 0], [5_000, 8_000], [8_000, 8_000]]);
  });
  it("si el periodo ya terminó llega hasta su fin; si no empezó, vacío", () => {
    expect(cumulativeBoth([], [], DIST, "2026-10-05", "2026-10-07", "2026-12-01")).toHaveLength(3);
    expect(cumulativeBoth([], [], DIST, "2026-10-05", "2026-10-07", "2026-10-01")).toEqual([]);
  });
});

describe("weeklyWins", () => {
  // hoy lunes 12 oct: la semana actual (12–18) no cuenta; la última completa es 5–11 oct.
  it("cuenta victorias de semanas completas y empates; ignora semanas vacías", () => {
    const mine = [day("2026-10-06", { distance: 20_000 }), day("2026-09-29", { distance: 5_000 }), day("2026-09-22", { distance: 9_000 }), day("2026-10-13", { distance: 99_000 })];
    const theirs = [day("2026-10-07", { distance: 10_000 }), day("2026-09-30", { distance: 8_000 }), day("2026-09-23", { distance: 9_000 })];
    const w = weeklyWins(mine, theirs, DIST, "2026-10-12", "mon", 4);
    expect(w.weeks.map((x) => x.weekStart)).toEqual(["2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"]);
    expect(w).toMatchObject({ mine: 1, theirs: 1, ties: 1 });
  });
  it("sin datos nadie gana", () => {
    expect(weeklyWins([], [], DIST, "2026-10-12", "mon", 8)).toMatchObject({ mine: 0, theirs: 0, ties: 0 });
  });
});

describe("windowFor", () => {
  it("semana y mes que contienen hoy", () => {
    expect(windowFor("week", "2026-10-07", "mon")).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(windowFor("month", "2026-10-07", "mon")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });
});
