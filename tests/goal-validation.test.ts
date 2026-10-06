import { describe, expect, it } from "vitest";
import { validateGoalPatch, validateNewGoal } from "@/lib/goal-validation";

const ok = {
  title: "  100 km en octubre ",
  metric: "distance",
  sports: ["run"],
  target: 100_000,
  period: "month",
  startDate: "2026-10-01",
  endDate: "2026-10-31",
};

describe("validateNewGoal", () => {
  it("acepta un goal válido y recorta el título", () => {
    const r = validateNewGoal(ok);
    expect(r.ok && r.value.title).toBe("100 km en octubre");
  });
  it.each([
    [{ ...ok, title: "" }, "título"],
    [{ ...ok, metric: "pace" }, "Métrica"],
    [{ ...ok, target: 0 }, "objetivo"],
    [{ ...ok, target: -5 }, "objetivo"],
    [{ ...ok, target: "abc" }, "objetivo"],
    [{ ...ok, startDate: "2026-02-30" }, "Fechas"],
    [{ ...ok, endDate: "2026-09-30" }, "posterior"],
    [{ ...ok, startDate: "2026-01-01", endDate: "2027-06-01" }, "un año"],
    [{ ...ok, metric: "streak", target: 40 }, "racha"],
    [null, "Cuerpo"],
  ])("rechaza %j", (input, fragment) => {
    const r = validateNewGoal(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(fragment);
  });
});

describe("validateGoalPatch", () => {
  it("acepta cambios parciales", () => {
    expect(validateGoalPatch({ status: "archived" })).toEqual({ ok: true, value: { status: "archived" } });
  });
  it("rechaza vacío y estados inválidos", () => {
    expect(validateGoalPatch({}).ok).toBe(false);
    expect(validateGoalPatch({ status: "x" }).ok).toBe(false);
  });
});

import { validateSports } from "@/lib/goal-validation";

describe("validateSports", () => {
  it("acepta cualquier combinación y la normaliza al orden canónico", () => {
    expect(validateSports(["walk", "run"])).toEqual({ ok: true, value: ["run", "walk"] });
    expect(validateSports(["walk"])).toEqual({ ok: true, value: ["walk"] });
    expect(validateSports(["ride", "walk", "run"])).toEqual({ ok: true, value: ["run", "ride", "walk"] });
  });
  it.each([[[]], [undefined], ["run"], [["swim"]], [["run", "run"]], [[1]]])("rechaza %j", (input) => {
    expect(validateSports(input).ok).toBe(false);
  });
  it("validateNewGoal rechaza el campo antiguo `sport`", () => {
    const r = validateNewGoal({ ...ok, sports: undefined, sport: "run" });
    expect(r.ok).toBe(false);
  });
});

import { applyGoalPatch } from "@/lib/goal-validation";
import type { Goal } from "@/lib/types";

const existing: Goal = {
  id: "g1",
  title: "100 km corriendo este mes",
  metric: "distance",
  sports: ["run"],
  target: 100_000,
  period: "month",
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  status: "active",
  createdAt: "2026-10-01T00:00:00Z",
};

describe("validateGoalPatch (edición completa)", () => {
  it("acepta deportes, periodo y fechas", () => {
    const r = validateGoalPatch({ sports: ["walk", "run"], period: "custom", startDate: "2026-10-05", endDate: "2026-11-05" });
    expect(r).toEqual({ ok: true, value: { sports: ["run", "walk"], period: "custom", startDate: "2026-10-05", endDate: "2026-11-05" } });
  });
  it.each([
    [{ startDate: "2026-10-05" }, "juntas"],
    [{ endDate: "2026-10-05" }, "juntas"],
    [{ period: "week" }, "junto con las fechas"],
    [{ startDate: "2026-02-30", endDate: "2026-03-01" }, "Fechas"],
    [{ sports: [] }, "al menos un deporte"],
    [{ sports: ["swim"] }, "Deporte"],
    [{ startDate: "2026-10-05", endDate: "2026-10-31", period: "decade" }, "Periodo"],
  ])("rechaza %j", (input, fragment) => {
    const r = validateGoalPatch(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(fragment);
  });
});

describe("applyGoalPatch (reglas entre campos)", () => {
  it("cambiar solo las fechas pasa el periodo a personalizado", () => {
    const r = applyGoalPatch(existing, { startDate: "2026-10-10", endDate: "2026-12-10" });
    expect(r).toEqual({ ok: true, value: { startDate: "2026-10-10", endDate: "2026-12-10", period: "custom" } });
  });
  it("respeta el periodo si se indica junto con las fechas", () => {
    const r = applyGoalPatch(existing, { period: "week", startDate: "2026-10-05", endDate: "2026-10-11" });
    expect(r.ok && r.value.period).toBe("week");
  });
  it("rechaza fin anterior al inicio y periodos de más de un año", () => {
    expect(applyGoalPatch(existing, { startDate: "2026-10-20", endDate: "2026-10-10" }).ok).toBe(false);
    expect(applyGoalPatch(existing, { startDate: "2026-01-01", endDate: "2027-06-01" }).ok).toBe(false);
  });
  it("valida el goal combinado: una racha no puede superar los días del periodo", () => {
    const streak: Goal = { ...existing, metric: "streak", target: 7, sports: ["run", "ride"] };
    expect(applyGoalPatch(streak, { startDate: "2026-10-01", endDate: "2026-10-03" }).ok).toBe(false);
    expect(applyGoalPatch(streak, { target: 40 }).ok).toBe(false); // periodo de 31 días
    expect(applyGoalPatch(streak, { target: 20 }).ok).toBe(true);
  });
  it("normaliza deportes y título, y devuelve solo lo que cambió", () => {
    const r = applyGoalPatch(existing, { title: "Nuevo", sports: ["walk", "run"] });
    expect(r).toEqual({ ok: true, value: { title: "Nuevo", sports: ["run", "walk"] } });
  });
  it("archivar no revalida el contenido", () => {
    const stale: Goal = { ...existing, target: 999_999_999_999 };
    expect(applyGoalPatch(stale, { status: "archived" })).toEqual({ ok: true, value: { status: "archived" } });
  });
});
