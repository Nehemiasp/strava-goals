import type { Progress } from "@/lib/goals-progress";

const COLOR: Record<Progress["state"], string> = {
  done: "var(--fern)",
  ahead: "var(--fern)",
  onpace: "var(--fern)",
  behind: "var(--amber)",
  expired: "var(--ink-3)",
  upcoming: "var(--ink-3)",
};

/** Barra de progreso con una muesca en el punto donde deberías ir hoy. Sustituye al anillo. */
export function PaceTrack({ progress, showMarker = true, thick = false }: { progress: Progress; showMarker?: boolean; thick?: boolean }) {
  const pct = Math.round(progress.ratio * 100);
  const marker = Math.min(1, progress.expected / progress.target);
  const hasMarker = showMarker && progress.state !== "done" && progress.state !== "upcoming" && progress.state !== "expired" && progress.expected !== progress.current;
  const h = thick ? 14 : 10;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label="Progreso del goal"
      className="relative"
      style={{ height: h + 8 }}
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-surface-2" style={{ height: h }}>
        <div
          className="h-full origin-left rounded-full"
          style={{
            width: `${Math.max(progress.ratio > 0 ? 2 : 0, progress.ratio * 100)}%`,
            background: COLOR[progress.state],
            animation: "grow-x 500ms cubic-bezier(0.2,0.8,0.2,1) both",
          }}
        />
      </div>
      {hasMarker && (
        <span
          aria-hidden
          title="Dónde deberías ir hoy"
          className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${marker * 100}%` }}
        />
      )}
    </div>
  );
}

export const stateColor = (s: Progress["state"]) => COLOR[s];
