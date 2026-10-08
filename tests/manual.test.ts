import { beforeEach, describe, expect, it } from "vitest";
import { isManual, toActivity } from "@/lib/manual";
import { DEFAULT_MANUAL_NAME, validateManual } from "@/lib/manual-validation";
import { createMemoryStore } from "@/lib/server/store-memory";
import type { AthleteRow, Store } from "@/lib/server/store";
import { toSharedDays } from "@/lib/versus";
import { buildBrief, DEFAULT_BRIEF_OPTIONS } from "@/lib/export-brief";
import { bestPace } from "@/lib/records";
import { computeProgress } from "@/lib/goals-progress";
import { DEFAULT_SETTINGS, type Activity, type Goal } from "@/lib/types";

const TODAY = "2026-10-08";
const ok = { sport: "walk", date: "2026-10-07", distance: 5_000, movingTime: 3_600, elevation: 40, name: "Paseo" };

describe("validateManual", () => {
  it("acepta una actividad válida y aplica valores por defecto", () => {
    expect(validateManual(ok, TODAY)).toEqual({ ok: true, value: ok });
    const r = validateManual({ sport: "run", date: TODAY, distance: 1000 }, TODAY);
    expect(r).toEqual({ ok: true, value: { sport: "run", date: TODAY, distance: 1000, movingTime: 0, elevation: 0, name: DEFAULT_MANUAL_NAME } });
  });
  it("trata tiempo y desnivel vacíos como 0 y redondea los segundos", () => {
    const r = validateManual({ ...ok, movingTime: "", elevation: null }, TODAY);
    expect(r.ok && [r.value.movingTime, r.value.elevation]).toEqual([0, 0]);
    expect(validateManual({ ...ok, movingTime: 90.6 }, TODAY)).toMatchObject({ ok: true, value: { movingTime: 91 } });
  });
  it.each([
    [{ ...ok, sport: "swim" }, "deporte"],
    [{ ...ok, date: "2026-02-30" }, "Fecha"],
    [{ ...ok, date: "07/10/2026" }, "Fecha"],
    [{ ...ok, date: "2026-10-12" }, "futura"],
    [{ ...ok, date: "2025-01-01" }, "400 días"],
    [{ ...ok, distance: 0 }, "mayor que cero"],
    [{ ...ok, distance: -3 }, "mayor que cero"],
    [{ ...ok, distance: "abc" }, "mayor que cero"],
    [{ ...ok, distance: 1_000_001 }, "demasiado grande"],
    [{ ...ok, movingTime: -1 }, "tiempo"],
    [{ ...ok, movingTime: 48 * 3600 + 1 }, "tiempo"],
    [{ ...ok, elevation: -5 }, "desnivel"],
    [{ ...ok, elevation: 20_001 }, "desnivel"],
    [{ ...ok, name: "x".repeat(81) }, "80"],
    [null, "Cuerpo"],
  ])("rechaza %j", (input, fragment) => {
    const r = validateManual(input, TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(fragment);
  });
  it("tolera un día adelante (zonas horarias) pero no dos", () => {
    expect(validateManual({ ...ok, date: "2026-10-09" }, TODAY).ok).toBe(true);
    expect(validateManual({ ...ok, date: "2026-10-10" }, TODAY).ok).toBe(false);
    expect(validateManual({ ...ok, date: "2025-09-08" }, TODAY).ok).toBe(true); // justo en el borde de 400 días
  });
});

describe("toActivity", () => {
  const row = { id: 7, ...ok, sport: "walk" as const, createdAt: "2026-10-07T20:00:00Z" };
  it("usa id negativo, marca la fuente y calcula la velocidad", () => {
    const a = toActivity(row);
    expect(a.id).toBe(-7);
    expect(isManual(a)).toBe(true);
    expect(a.source).toBe("manual");
    expect(a.startedAt).toBe("2026-10-07T12:00:00Z");
    expect(a.avgSpeed).toBeCloseTo(5000 / 3600, 6);
    expect(a.avgHr).toBeNull();
    expect(a.polyline).toBeNull();
  });
  it("sin tiempo no hay ritmo", () => {
    expect(toActivity({ ...row, movingTime: 0 }).avgSpeed).toBe(0);
  });
});

describe("almacén en memoria", () => {
  let store: Store;
  const athlete = (id: number): AthleteRow => ({ id, name: `a${id}`, avatar: null, accessTokenEnc: "", refreshTokenEnc: "", expiresAt: 0, syncedAt: null });
  beforeEach(async () => {
    (globalThis as { __sgMemDb?: unknown }).__sgMemDb = undefined;
    store = createMemoryStore();
    await store.upsertAthlete(athlete(1));
    await store.upsertAthlete(athlete(2));
  });
  const input = { sport: "ride" as const, date: "2026-10-05", distance: 20_000, movingTime: 3000, elevation: 100, name: "Rodada" };

  it("crear, listar, editar y borrar", async () => {
    const m = await store.createManual(1, input);
    expect(m.id).toBeGreaterThan(0);
    expect(await store.countManual(1)).toBe(1);
    expect((await store.listManual(1, "2026-10-01")).map((x) => x.id)).toEqual([m.id]);
    expect(await store.listManual(1, "2026-10-06")).toEqual([]);
    const edited = await store.updateManual(1, m.id, { ...input, distance: 25_000 });
    expect(edited?.distance).toBe(25_000);
    expect(await store.deleteManual(1, m.id)).toBe(true);
    expect(await store.countManual(1)).toBe(0);
  });
  it("una persona no puede ver, editar ni borrar las de otra", async () => {
    const m = await store.createManual(1, input);
    expect(await store.listManual(2, "2020-01-01")).toEqual([]);
    expect(await store.updateManual(2, m.id, input)).toBeNull();
    expect(await store.deleteManual(2, m.id)).toBe(false);
    expect(await store.countManual(1)).toBe(1);
  });
  it("los ids no se repiten entre personas", async () => {
    const a = await store.createManual(1, input);
    const b = await store.createManual(2, input);
    expect(a.id).not.toBe(b.id);
  });
  it("borrar los datos del atleta elimina sus manuales", async () => {
    await store.createManual(1, input);
    await store.deleteAthlete(1);
    expect(await store.countManual(1)).toBe(0);
  });
});

describe("las manuales cuentan en todo", () => {
  const manual: Activity = toActivity({ id: 3, sport: "walk", date: "2026-10-06", distance: 8_000, movingTime: 0, elevation: 0, name: "Caminata", createdAt: "" });
  const strava: Activity = { ...manual, id: 99, source: "strava", sportType: "Walk", movingTime: 3000, avgSpeed: 2.6 };
  const goal: Goal = {
    id: "g", title: "x", metric: "distance", sports: ["walk"], target: 20_000, period: "month",
    startDate: "2026-10-01", endDate: "2026-10-31", status: "active", createdAt: "",
  };

  it("suman en el progreso de un goal junto a las de Strava", () => {
    expect(computeProgress(goal, [strava, manual], TODAY).current).toBe(16_000);
    expect(computeProgress(goal, [manual], TODAY).current).toBe(8_000);
  });
  it("entran a los totales compartidos sin exponer nada más", () => {
    const days = toSharedDays([strava, manual]);
    expect(days).toEqual([{ date: "2026-10-06", sport: "walk", distance: 16_000, movingTime: 3000, elevation: 0, count: 2 }]);
    expect(JSON.stringify(days)).not.toContain("Caminata");
  });
  it("no cuentan para el mejor ritmo cuando no hay tiempo", () => {
    const run = { ...manual, sport: "run" as const, distance: 10_000 };
    expect(bestPace([run])).toBeNull();
  });
  it("el brief las marca como manuales", () => {
    const b = buildBrief([manual], [], DEFAULT_BRIEF_OPTIONS, DEFAULT_SETTINGS, TODAY);
    expect(b.text).toContain("Caminar (manual)");
    const json = JSON.parse(buildBrief([manual], [], { ...DEFAULT_BRIEF_OPTIONS, format: "json" }, DEFAULT_SETTINGS, TODAY).text);
    expect(json.actividades[0].fuente).toBe("manual");
  });
});
