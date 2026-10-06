/** Codificación "Encoded Polyline Algorithm" (precisión 5), la que usa Strava en `summary_polyline`. */

export function decodePolyline(str: string): [number, number][] {
  const out: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < str.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < str.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

export function encodePolyline(points: [number, number][]): string {
  let prevLat = 0;
  let prevLng = 0;
  let out = "";
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    return s + String.fromCharCode(n + 63);
  };
  for (const [la, lo] of points) {
    const lat = Math.round(la * 1e5);
    const lng = Math.round(lo * 1e5);
    out += enc(lat - prevLat) + enc(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

/**
 * Convierte una polilínea en un `path` SVG normalizado a un cuadro `size`×`size`,
 * conservando la proporción. Corrige la longitud para que no se deforme con la latitud.
 */
export function polylineToPath(encoded: string, size = 56, pad = 4): string | null {
  const pts = decodePolyline(encoded);
  if (pts.length < 2) return null;
  const meanLat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const k = Math.cos((meanLat * Math.PI) / 180);
  const xy = pts.map(([la, lo]) => [lo * k, -la] as const);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  const span = Math.max(w, h);
  if (span === 0) return null;
  const inner = size - pad * 2;
  const scale = inner / span;
  const offX = pad + (inner - w * scale) / 2;
  const offY = pad + (inner - h * scale) / 2;
  // Se reduce el número de puntos para mantener el SVG liviano.
  const step = Math.max(1, Math.floor(xy.length / 80));
  const parts: string[] = [];
  for (let i = 0; i < xy.length; i += step) {
    const [x, y] = xy[i];
    parts.push(`${i === 0 ? "M" : "L"}${((x - minX) * scale + offX).toFixed(1)} ${((y - minY) * scale + offY).toFixed(1)}`);
  }
  return parts.join("");
}
