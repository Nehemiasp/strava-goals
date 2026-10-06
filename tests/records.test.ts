import { describe, expect, it } from "vitest";
import { bestPace, bestWeek, compareMonth, compareWeek, currentStreak, longestBySport, pctChange } from "@/lib/records";
import type { Activity } from "@/lib/types";

let n = 0;
const act = (date: string, over: Partial<Activity> = {}): Activity => ({
  id: ++n,
  name: "x",
  sport: "run",
  sportType: "Run",
  date,
  startedAt: `${date}T10:00:00Z`,
  distance: 10_000,
  movingTime: 3000,
  elevation: 50,
  avgSpeed: 3.3,
  avgHr: null,
  polyline: null,
  ...over,
});

describe("currentStreak", () => {
  it("cuenta los días seguidos hasta hoy", () => {
    expect(currentStreak(["2026-10-04", "2026-10-05", "2026-10-06"], "2026-10-06")).toBe(3);
  });
  it("si hoy aún no hay salida, cuenta hasta ayer y no se rompe", () => {
    expect(currentStreak(["2026-10-03", "2026-10-04", "2026-10-05"], "2026-10-06")).toBe(3);
  });
  it("se rompe si falta ayer y hoy", () => {
    expect(currentStreak(["2026-10-03", "2026-10-04"], "2026-10-06")).toBe(0);
    expect(currentStreak([], "2026-10-06")).toBe(0);
  });
  it("ignora huecos anteriores y duplicados, y cruza meses", () => {
    expect(currentStreak(["2026-09-29", "2026-09-30", "2026-09-30", "2026-10-01", "2026-09-20"], "2026-10-01")).toBe(3);
  });
});

describe("bestWeek", () => {
  it("devuelve la semana con más distancia", () => {
    const acts = [act("2026-09-28", { distance: 5_000 }), act("2026-09-30", { distance: 6_000 }), act("2026-10-05", { distance: 9_000 })];
    expect(bestWeek(acts, "mon")).toEqual({ weekStart: "2026-09-28", distance: 11_000, count: 2 });
  });
  it("sin actividades es null", () => {
    expect(bestWeek([], "mon")).toBeNull();
  });
});

describe("longestBySport / bestPace", () => {
  it("la más larga por deporte presente", () => {
    const run = act("2026-10-01", { distance: 21_000 });
    const ride = act("2026-10-02", { sport: "ride", distance: 80_000 });
    const out = longestBySport([act("2026-10-03", { distance: 5_000 }), run, ride]);
    expect(out.run?.id).toBe(run.id);
    expect(out.ride?.id).toBe(ride.id);
    expect(out.walk).toBeUndefined();
  });
  it("el mejor ritmo exige al menos 5 km y solo cuenta correr", () => {
    const fastShort = act("2026-10-01", { distance: 3_000, avgSpeed: 5 });
    const okSlow = act("2026-10-02", { distance: 6_000, avgSpeed: 3 });
    const okFast = act("2026-10-03", { distance: 5_000, avgSpeed: 4 });
    const fastRide = act("2026-10-04", { sport: "ride", distance: 40_000, avgSpeed: 9 });
    expect(bestPace([fastShort, okSlow, okFast, fastRide])?.id).toBe(okFast.id);
    expect(bestPace([fastShort, fastRide])).toBeNull();
  });
});

describe("comparaciones", () => {
  // 2026-10-07 es miércoles: semana desde el lunes 5; la anterior, 28 sep – 4 oct.
  it("semana: compara hasta el mismo día de la semana", () => {
    const acts = [
      act("2026-10-05", { distance: 10_000 }),
      act("2026-10-06", { distance: 5_000 }),
      act("2026-09-28", { distance: 8_000 }),
      act("2026-09-30", { distance: 4_000 }), // miércoles anterior: cuenta
      act("2026-10-02", { distance: 20_000 }), // viernes anterior: aún no toca comparar
    ];
    const c = compareWeek(acts, "2026-10-07", "mon");
    expect(c.current.distance).toBe(15_000);
    expect(c.previous.distance).toBe(12_000);
    expect(c.distancePct).toBeCloseTo(25, 5);
    expect(c.current.count).toBe(2);
  });
  it("sin semana anterior no hay porcentaje", () => {
    const c = compareWeek([act("2026-10-05")], "2026-10-07", "mon");
    expect(c.distancePct).toBeNull();
  });
  it("mes: compara hasta el mismo día y acota a meses cortos", () => {
    const acts = [act("2026-10-02", { distance: 10_000 }), act("2026-09-01", { distance: 4_000 }), act("2026-09-10", { distance: 99_000 })];
    const c = compareMonth(acts, "2026-10-03");
    expect(c.current.distance).toBe(10_000);
    expect(c.previous.distance).toBe(4_000); // 1–3 sept; el 10 de sept queda fuera
    // 31 de marzo frente a febrero (28 días): no se sale del mes anterior.
    const feb = compareMonth([act("2026-02-28", { distance: 7_000 })], "2026-03-31");
    expect(feb.previous.distance).toBe(7_000);
  });
  it("pctChange", () => {
    expect(pctChange(15, 10)).toBe(50);
    expect(pctChange(5, 10)).toBe(-50);
    expect(pctChange(5, 0)).toBeNull();
  });
});
