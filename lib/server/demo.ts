import "server-only";
import { addDays, periodRange, weekday } from "../dates";
import { encodePolyline } from "../polyline";
import type { Activity, NewGoal, Sport } from "../types";

export const DEMO_ATHLETE_ID = 1;

// PRNG determinista (mulberry32) para que el demo sea estable entre recargas.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Recorrido cerrado irregular alrededor de un centro, para las siluetas de ruta. */
function loop(rand: () => number, radius: number, lobes: number): string {
  const cLat = 19.43;
  const cLng = -99.13;
  const phase = rand() * Math.PI * 2;
  const amps = Array.from({ length: lobes }, () => 0.25 + rand() * 0.5);
  const pts: [number, number][] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    let r = 1;
    amps.forEach((amp, k) => (r += (amp / (k + 2)) * Math.sin((k + 2) * t + phase)));
    pts.push([cLat + Math.sin(t) * r * radius, cLng + Math.cos(t) * r * radius * 1.1]);
  }
  return encodePolyline(pts);
}

const NAMES = {
  run: ["Rodaje suave", "Series 6×800", "Tempo en el parque", "Fondo de domingo", "Recuperación", "Cuestas"],
  ride: ["Salida a la sierra", "Rodada de tarde", "Fondo largo", "Commute extendido", "Intervalos en rodillo"],
  walk: ["Caminata al parque", "Paseo de la tarde", "Caminata con perro", "Senderismo en el cerro"],
} as const;

/** Genera ~16 semanas de actividad, la más reciente terminando en `today`. */
export function demoActivities(today: string): Activity[] {
  const rand = rng(42);
  const out: Activity[] = [];
  let id = 9_000_000;
  for (let back = 0; back < 112; back++) {
    const date = addDays(today, -back);
    const wd = weekday(date);
    // Patrón semanal: corre mar/jue/dom, bici sáb (y a veces mié), camina lun y a veces vie.
    const plan: Sport[] = [];
    if ([1, 3, 6].includes(wd) && rand() > 0.12) plan.push("run");
    if (wd === 5 && rand() > 0.15) plan.push("ride");
    if (wd === 2 && rand() > 0.7) plan.push("ride");
    if (wd === 0 && rand() > 0.15) plan.push("walk");
    if (wd === 4 && rand() > 0.5) plan.push("walk");
    for (const sport of plan) {
      const long = (sport === "run" && wd === 6) || (sport === "ride" && wd === 5);
      const distance =
        sport === "run"
          ? long ? 12_000 + rand() * 6_000 : 5_000 + rand() * 4_500
          : sport === "ride"
            ? long ? 45_000 + rand() * 30_000 : 20_000 + rand() * 12_000
            : 3_000 + rand() * 4_000;
      const speed = sport === "run" ? 2.9 + rand() * 0.7 : sport === "ride" ? 6.4 + rand() * 1.6 : 1.3 + rand() * 0.3; // m/s
      const startHour = sport === "run" ? 6 + Math.floor(rand() * 2) : sport === "ride" ? 7 + Math.floor(rand() * 3) : 17 + Math.floor(rand() * 2);
      const names = NAMES[sport];
      const climb = sport === "run" ? 0.009 * (0.6 + rand()) : sport === "ride" ? 0.012 * (0.5 + rand()) : 0.01 * (0.5 + rand());
      const radius = sport === "run" ? 0.012 + rand() * 0.008 : sport === "ride" ? 0.03 + rand() * 0.02 : 0.006 + rand() * 0.006;
      id += 1;
      out.push({
        id,
        name: names[Math.floor(rand() * names.length)],
        sport,
        sportType: sport === "run" ? "Run" : sport === "ride" ? "Ride" : "Walk",
        date,
        startedAt: `${date}T${String(startHour + 6).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00Z`,
        distance: Math.round(distance),
        movingTime: Math.round(distance / speed),
        elevation: Math.round(distance * climb),
        avgSpeed: speed,
        avgHr: rand() > 0.1 ? Math.round((sport === "run" ? 148 : sport === "ride" ? 138 : 108) + rand() * 14) : null,
        polyline: loop(rand, radius, 3 + Math.floor(rand() * 3)),
      });
    }
  }
  return out;
}

export function demoGoals(today: string): NewGoal[] {
  const month = periodRange("month", today);
  const week = periodRange("week", today);
  const year = periodRange("year", today);
  return [
    { title: "100 km corriendo este mes", metric: "distance", sports: ["run"], target: 100_000, period: "month", ...month },
    { title: "3 salidas por semana", metric: "count", sports: ["run", "ride", "walk"], target: 3, period: "week", ...week },
    { title: "1.500 km en bici este año", metric: "distance", sports: ["ride"], target: 1_500_000, period: "year", ...year },
    { title: "20 km caminando este mes", metric: "distance", sports: ["walk"], target: 20_000, period: "month", ...month },
  ];
}
