import { describe, expect, it } from "vitest";
import { mapActivity, sportOf } from "@/lib/server/strava";

const raw = (over: Record<string, unknown>) => ({
  id: 1,
  name: "Salida",
  type: "Run",
  start_date: "2026-10-05T12:00:00Z",
  start_date_local: "2026-10-05T07:00:00Z",
  distance: 5000,
  moving_time: 1800,
  total_elevation_gain: 20,
  average_speed: 2.8,
  map: { summary_polyline: "abc" },
  ...over,
});

describe("sportOf", () => {
  it.each([
    ["Run", "run"], ["TrailRun", "run"], ["VirtualRun", "run"],
    ["Ride", "ride"], ["GravelRide", "ride"], ["MountainBikeRide", "ride"], ["EBikeRide", "ride"], ["VirtualRide", "ride"],
    ["Walk", "walk"], ["Hike", "walk"],
  ])("%s → %s", (type, sport) => {
    expect(sportOf(type)).toBe(sport);
  });
  it.each(["Swim", "Yoga", "WeightTraining", "Workout", "Snowshoe", ""])("ignora %s", (type) => {
    expect(sportOf(type)).toBeNull();
  });
});

describe("mapActivity", () => {
  it("mapea una caminata usando sport_type", () => {
    const a = mapActivity(raw({ type: "Walk", sport_type: "Walk", average_heartrate: 104.6 }))!;
    expect(a.sport).toBe("walk");
    expect(a.sportType).toBe("Walk");
    expect(a.date).toBe("2026-10-05");
    expect(a.avgHr).toBe(104.6);
  });
  it("un Hike cuenta como caminar", () => {
    expect(mapActivity(raw({ type: "Hike", sport_type: "Hike" }))!.sport).toBe("walk");
  });
  it("sin sport_type cae a type", () => {
    expect(mapActivity(raw({ type: "Walk", sport_type: undefined }))!.sport).toBe("walk");
  });
  it("usa sport_type sobre type cuando difieren (p. ej. senderismo registrado como Walk)", () => {
    expect(mapActivity(raw({ type: "Walk", sport_type: "TrailRun" }))!.sport).toBe("run");
  });
  it("descarta deportes no soportados y tolera campos ausentes", () => {
    expect(mapActivity(raw({ type: "Swim", sport_type: "Swim" }))).toBeNull();
    const a = mapActivity(raw({ type: "Walk", map: undefined, average_speed: undefined }))!;
    expect(a.polyline).toBeNull();
    expect(a.avgSpeed).toBe(0);
  });
});
