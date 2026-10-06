import { polylineToPath } from "@/lib/polyline";
import type { Sport } from "@/lib/types";
import { IconBike, IconRun } from "./icons";

const COLOR: Record<Sport, string> = { run: "var(--run)", ride: "var(--ride)" };

/** Silueta del recorrido a partir de la polilínea de Strava. Sin polilínea muestra el icono del deporte. */
export function RouteGlyph({ polyline, sport, show = true }: { polyline: string | null; sport: Sport; show?: boolean }) {
  const path = show && polyline ? polylineToPath(polyline, 56, 6) : null;
  return (
    <div
      aria-hidden
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-field bg-surface-2"
      style={{ color: COLOR[sport] }}
    >
      {path ? (
        <svg viewBox="0 0 56 56" width="56" height="56" fill="none">
          <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : sport === "run" ? (
        <IconRun size={22} strokeWidth={1.75} />
      ) : (
        <IconBike size={22} strokeWidth={1.75} />
      )}
    </div>
  );
}
