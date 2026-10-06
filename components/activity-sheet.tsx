"use client";

import { distanceUnit, elevationUnit, formatDistance, formatDuration, formatElevation, formatPace, formatSpeed, longDate, sportLabel } from "@/lib/format";
import type { Activity, Settings } from "@/lib/types";
import { IconExternal } from "./icons";
import { RouteGlyph } from "./route-glyph";
import { Sheet } from "./sheet";
import { StatBlock } from "./ui";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-field bg-surface px-4 py-3">
      <div className="label text-ink-2">{label}</div>
      <div className="title-m tnum mt-0.5">{value}</div>
    </div>
  );
}

export function ActivitySheet({ activity: a, settings, onClose }: { activity: Activity | null; settings: Settings; onClose: () => void }) {
  const { units } = settings;
  return (
    <Sheet open={a !== null} onClose={onClose} title={a?.name ?? ""}>
      {a && (
        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="label mb-1 text-ink-2">
                {sportLabel(a.sport)} · {longDate(a.date)}
              </div>
              <StatBlock value={formatDistance(a.distance, units)} unit={distanceUnit(units)} size="l" />
            </div>
            <RouteGlyph polyline={a.polyline} sport={a.sport} show={settings.routeGlyphs} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Metric label="Tiempo en movimiento" value={formatDuration(a.movingTime)} />
            <Metric
              label={a.sport === "run" ? `Ritmo medio` : "Velocidad media"}
              value={a.sport === "run" ? `${formatPace(a.avgSpeed, units)} /${distanceUnit(units)}` : `${formatSpeed(a.avgSpeed, units)} ${distanceUnit(units)}/h`}
            />
            <Metric label="Desnivel positivo" value={`${formatElevation(a.elevation, units)} ${elevationUnit(units)}`} />
            <Metric label="Frecuencia cardíaca" value={a.avgHr ? `${Math.round(a.avgHr)} ppm` : "–"} />
          </div>
          <a
            href={`https://www.strava.com/activities/${a.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 font-medium text-fern"
          >
            Ver en Strava <IconExternal size={18} strokeWidth={1.75} aria-hidden />
          </a>
        </div>
      )}
    </Sheet>
  );
}
