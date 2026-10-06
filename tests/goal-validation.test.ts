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
