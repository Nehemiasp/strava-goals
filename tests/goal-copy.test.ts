import { describe, expect, it } from "vitest";
import { baseToInput, goalSentence, inputToBase, projectionText, requiredPerDay, statusText, suggestTitle } from "@/lib/goal-copy";
import { computeProgress } from "@/lib/goals-progress";
import type { Activity, Goal } from "@/lib/types";

const goal: Goal = {
  id: "g",
  title: "x",
  metric: "distance",
  sports: ["run"],
  target: 100_000,
  period: "month",
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  status: "active",
  createdAt: "",
};
const run = (date: string, distance: number): Activity => ({
  id: Math.random(), name: "", sport: "run", sportType: "Run", date, startedAt: `${date}T10:00:00Z`,
  distance, movingTime: 1, elevation: 0, avgSpeed: 3, avgHr: null, polyline: null,
});

describe("statusText", () => {
  it("dice por delante / por detrás con la unidad del goal", () => {
    const ahead = computeProgress(goal, [run("2026-10-02", 40_000)], "2026-10-10");
    expect(statusText(goal, ahead, "metric")).toMatch(/^Vas .* km por delante$/);
    const behind = computeProgress(goal, [], "2026-10-10");
    expect(statusText(goal, behind, "metric")).toMatch(/^Vas .* km por detrás$/);
  });
  it("cubre cumplido, vencido y futuro", () => {
    expect(statusText(goal, computeProgress(goal, [run("2026-10-02", 100_000)], "2026-10-10"), "metric")).toBe("Cumplido");
    expect(statusText(goal, computeProgress(goal, [run("2026-10-02", 50_000)], "2026-11-05"), "metric")).toContain("Cerró en");
    expect(statusText(goal, computeProgress(goal, [], "2026-09-20"), "metric")).toContain("Empieza el");
  });
});

describe("requiredPerDay / projectionText", () => {
  it("reparte lo que falta entre los días restantes incluyendo hoy", () => {
    const p = computeProgress(goal, [run("2026-10-02", 40_000)], "2026-10-21"); // quedan 10 días + hoy
    expect(requiredPerDay(goal, p)).toBeCloseTo(60_000 / 11, 3);
  });
  it("no proyecta demasiado pronto", () => {
    const p = computeProgress(goal, [run("2026-10-01", 10_000)], "2026-10-02");
    expect(projectionText(goal, p, "metric")).toBeNull();
  });
  it("proyecta con datos suficientes", () => {
    const p = computeProgress(goal, [run("2026-10-02", 20_000)], "2026-10-10");
    expect(projectionText(goal, p, "metric")).toContain("A este ritmo cerrarás en");
  });
});

describe("conversión de unidades de entrada", () => {
  it("ida y vuelta", () => {
    for (const metric of ["distance", "time", "elevation", "count"] as const) {
      for (const units of ["metric", "imperial"] as const) {
        expect(baseToInput(metric, inputToBase(metric, 42, units), units)).toBeCloseTo(42, 6);
      }
    }
  });
  it("km → metros y horas → segundos", () => {
    expect(inputToBase("distance", 100, "metric")).toBe(100_000);
    expect(inputToBase("time", 2, "metric")).toBe(7200);
  });
});

describe("textos de creación", () => {
  it("sugiere un título legible", () => {
    expect(suggestTitle({ metric: "distance", sports: ["run"], target: 100_000, period: "month" }, "metric")).toBe("100 km corriendo este mes");
    expect(suggestTitle({ metric: "count", sports: ["run", "ride", "walk"], target: 3, period: "week" }, "metric")).toBe("3 salidas por semana");
  });
  it("resume el goal en una frase", () => {
    const s = goalSentence({ metric: "distance", sports: ["run"], target: 100_000, startDate: "2026-10-01", endDate: "2026-10-31" }, "metric");
    expect(s).toBe("Correr 100 km entre el 1 de octubre de 2026 y el 31 de octubre de 2026");
  });
});

describe("textos con varios deportes", () => {
  const base = { metric: "distance" as const, target: 30_000, period: "month" as const };
  it("títulos", () => {
    expect(suggestTitle({ ...base, sports: ["walk"] }, "metric")).toBe("30 km caminando este mes");
    expect(suggestTitle({ ...base, sports: ["run", "walk"] }, "metric")).toBe("30 km corriendo y caminando este mes");
    expect(suggestTitle({ ...base, sports: ["run", "ride", "walk"] }, "metric")).toBe("30 km este mes");
    expect(suggestTitle({ metric: "count", target: 3, period: "week", sports: ["walk"] }, "metric")).toBe("3 salidas por semana caminando");
  });
  it("frases de resumen", () => {
    const r = { startDate: "2026-10-01", endDate: "2026-10-31" };
    expect(goalSentence({ ...base, ...r, sports: ["walk"] }, "metric")).toMatch(/^Caminar 30 km entre el/);
    expect(goalSentence({ ...base, ...r, sports: ["run", "walk"] }, "metric")).toMatch(/^Correr y caminar 30 km entre el/);
    expect(goalSentence({ ...base, ...r, sports: ["run", "ride", "walk"] }, "metric")).toMatch(/^Moverte 30 km entre el/);
    expect(goalSentence({ metric: "count", target: 3, sports: ["walk"], ...r }, "metric")).toMatch(/^Hacer 3 salidas caminando entre el/);
  });
});
