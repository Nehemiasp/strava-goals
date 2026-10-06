import { describe, expect, it } from "vitest";
import { computeProgress, cumulativeSeries, longestStreak } from "@/lib/goals-progress";
import { periodRange, startOfWeek, weekday } from "@/lib/dates";
import type { Activity, Goal } from "@/lib/types";

const act = (over: Partial<Activity> & Pick<Activity, "id" | "date">): Activity => ({
  name: "x",
  sport: "run",
  sportType: "Run",
  startedAt: `${over.date}T12:00:00Z`,
  distance: 10_000,
  movingTime: 3000,
  elevation: 50,
  avgSpeed: 3.3,
  avgHr: null,
  polyline: null,
  ...over,
});

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "g1",
  title: "100 km en octubre",
  metric: "distance",
  sport: "run",
  target: 100_000,
  period: "month",
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  status: "active",
  createdAt: "2026-10-01T00:00:00Z",
  ...over,
});

describe("computeProgress", () => {
  it("suma distancia solo del deporte y periodo del goal", () => {
    const acts = [
      act({ id: 1, date: "2026-10-02" }),
      act({ id: 2, date: "2026-10-03", sport: "ride", distance: 50_000 }),
      act({ id: 3, date: "2026-09-30" }),
      act({ id: 4, date: "2026-10-05", distance: 5_000 }),
    ];
    const p = computeProgress(goal(), acts, "2026-10-06");
    expect(p.current).toBe(15_000);
    expect(p.activities.map((a) => a.id)).toEqual([4, 1]);
  });

  it("calcula el ritmo esperado de forma lineal incluyendo hoy", () => {
    // Día 10 de 31 ⇒ 10/31 del objetivo
    const p = computeProgress(goal(), [], "2026-10-10");
    expect(p.expected).toBeCloseTo(100_000 * (10 / 31), 5);
    expect(p.totalDays).toBe(31);
    expect(p.daysLeft).toBe(21);
  });

  it("marca por delante, al día y atrasado", () => {
    const base = computeProgress(goal(), [], "2026-10-10").expected;
    const ahead = computeProgress(goal(), [act({ id: 1, date: "2026-10-02", distance: base + 5_000 })], "2026-10-10");
    const onpace = computeProgress(goal(), [act({ id: 1, date: "2026-10-02", distance: base })], "2026-10-10");
    const behind = computeProgress(goal(), [act({ id: 1, date: "2026-10-02", distance: base - 5_000 })], "2026-10-10");
    expect(ahead.state).toBe("ahead");
    expect(ahead.delta).toBeCloseTo(5_000, 5);
    expect(onpace.state).toBe("onpace");
    expect(behind.state).toBe("behind");
  });

  it("marca cumplido, vencido y futuro", () => {
    const done = computeProgress(goal(), [act({ id: 1, date: "2026-10-02", distance: 100_000 })], "2026-10-10");
    const expired = computeProgress(goal(), [act({ id: 1, date: "2026-10-02" })], "2026-11-02");
    const upcoming = computeProgress(goal({ startDate: "2026-11-01", endDate: "2026-11-30" }), [], "2026-10-10");
    expect(done.state).toBe("done");
    expect(done.ratio).toBe(1);
    expect(expired.state).toBe("expired");
    expect(upcoming.state).toBe("upcoming");
  });

  it("proyecta el cierre al ritmo actual", () => {
    // 20 km en 10 de 31 días ⇒ 62 km
    const p = computeProgress(goal(), [act({ id: 1, date: "2026-10-02", distance: 20_000 })], "2026-10-10");
    expect(p.projected).toBeCloseTo(62_000, 3);
  });

  it("cuenta salidas para metas de frecuencia", () => {
    const g = goal({ metric: "count", sport: "both", target: 3, period: "week", startDate: "2026-10-05", endDate: "2026-10-11" });
    const p = computeProgress(
      g,
      [act({ id: 1, date: "2026-10-05" }), act({ id: 2, date: "2026-10-06", sport: "ride" })],
      "2026-10-07",
    );
    expect(p.current).toBe(2);
    expect(p.expected).toBeCloseTo(3 * (3 / 7), 5);
  });

  it("no proyecta rachas", () => {
    const g = goal({ metric: "streak", sport: "both", target: 7 });
    const p = computeProgress(g, [act({ id: 1, date: "2026-10-02" })], "2026-10-05");
    expect(p.projected).toBeNull();
  });
});

describe("longestStreak", () => {
  it("encuentra la racha más larga e ignora duplicados", () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(["2026-10-01", "2026-10-01", "2026-10-02", "2026-10-04", "2026-10-05", "2026-10-06"])).toBe(3);
  });
  it("cruza cambios de mes", () => {
    expect(longestStreak(["2026-09-30", "2026-10-01", "2026-10-02"])).toBe(3);
  });
});

describe("cumulativeSeries", () => {
  it("acumula por día hasta hoy", () => {
    const g = goal({ startDate: "2026-10-01", endDate: "2026-10-10", target: 100_000 });
    const s = cumulativeSeries(g, [act({ id: 1, date: "2026-10-02", distance: 8_000 }), act({ id: 2, date: "2026-10-04", distance: 2_000 })], "2026-10-05");
    expect(s).toHaveLength(5);
    expect(s.map((p) => p.value)).toEqual([0, 8_000, 8_000, 10_000, 10_000]);
    expect(s[4].expected).toBeCloseTo(50_000, 5);
  });
});

describe("dates", () => {
  it("calcula inicio de semana lunes y domingo", () => {
    expect(weekday("2026-10-06")).toBe(1); // martes
    expect(startOfWeek("2026-10-06", "mon")).toBe("2026-10-05");
    expect(startOfWeek("2026-10-06", "sun")).toBe("2026-10-04");
    expect(startOfWeek("2026-10-04", "mon")).toBe("2026-09-28");
  });
  it("calcula rangos de periodo", () => {
    expect(periodRange("month", "2026-02-10")).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
    expect(periodRange("year", "2026-10-06")).toEqual({ startDate: "2026-01-01", endDate: "2026-12-31" });
    expect(periodRange("week", "2026-10-06")).toEqual({ startDate: "2026-10-05", endDate: "2026-10-11" });
  });
});
