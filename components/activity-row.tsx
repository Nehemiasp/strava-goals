import { distanceUnit, elevationUnit, formatDistance, formatDuration, formatElevation, formatPaceOrSpeed, relativeDate, sportLabel } from "@/lib/format";
import type { Activity, Settings } from "@/lib/types";
import { RouteGlyph } from "./route-glyph";

export function activitySentence(a: Activity, units: Settings["units"], today: string): string {
  return `${a.name}, ${sportLabel(a.sport)}, ${relativeDate(a.date, today)}, ${formatDistance(a.distance, units)} ${distanceUnit(units) === "km" ? "kilómetros" : "millas"}, ${formatDuration(a.movingTime)}`;
}

export function ActivityRow({
  activity: a,
  settings,
  today,
  onOpen,
}: {
  activity: Activity;
  settings: Settings;
  today: string;
  onOpen?: (a: Activity) => void;
}) {
  const { units } = settings;
  // Rejilla de 3 filas: la tercera ocupa todo el ancho para que ninguna cifra se trunque.
  const content = (
    <div className="grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-x-3.5 gap-y-0.5 text-left">
      <div className="row-span-3 self-center">
        <RouteGlyph polyline={a.polyline} sport={a.sport} show={settings.routeGlyphs} />
      </div>
      <div className="min-w-0 truncate font-medium">{a.name}</div>
      <div className="text-right">
        <span className="title-m tnum">{formatDistance(a.distance, units)}</span>
        <span className="ml-1 text-sm font-medium text-ink-3">{distanceUnit(units)}</span>
      </div>
      <div className="body-s col-span-2 min-w-0 truncate text-ink-2">
        {sportLabel(a.sport)} · {relativeDate(a.date, today)}
      </div>
      <div className="body-s tnum col-span-2 text-ink-3">
        {formatPaceOrSpeed(a.sport, a.avgSpeed, units)} · {formatDuration(a.movingTime)} · +{formatElevation(a.elevation, units)} {elevationUnit(units)}
      </div>
    </div>
  );
  const cls = "block w-full px-4 py-3";
  return onOpen ? (
    <button type="button" onClick={() => onOpen(a)} aria-label={activitySentence(a, units, today)} className={`${cls} active:bg-surface-2`}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}

/** Contenedor sin bordes: las filas se separan por espacio y se agrupan en una superficie. */
export function ActivityList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-0.5 overflow-hidden rounded-card bg-surface py-1.5">{children}</div>;
}
