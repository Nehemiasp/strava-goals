import { describe, expect, it } from "vitest";
import { decodePolyline, encodePolyline, polylineToPath } from "@/lib/polyline";

describe("polyline", () => {
  it("decodifica el ejemplo oficial de Google", () => {
    const pts = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(pts).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });
  it("codifica y decodifica sin pérdida", () => {
    const pts: [number, number][] = [
      [19.4326, -99.1332],
      [19.4401, -99.1201],
      [19.4287, -99.1099],
    ];
    expect(decodePolyline(encodePolyline(pts))).toEqual(pts);
  });
  it("genera un path SVG dentro del cuadro", () => {
    const path = polylineToPath("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 56, 4)!;
    expect(path.startsWith("M")).toBe(true);
    const nums = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...nums)).toBeLessThanOrEqual(52);
  });
  it("devuelve null con trazos degenerados", () => {
    expect(polylineToPath("")).toBeNull();
  });
});
