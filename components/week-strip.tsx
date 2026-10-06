import { addDays, startOfWeek } from "@/lib/dates";
import type { Activity, Settings } from "@/lib/types";

const LABELS_MON = ["L", "M", "X", "J", "V", "S", "D"];
const LABELS_SUN = ["D", "L", "M", "X", "J", "V", "S"];

/** Siete columnas; altura proporcional a los km del día, correr y bici apilados en sus colores. */
export function WeekStrip({
  activities,
  today,
  weekStart,
}: {
  activities: Activity[];
  today: string;
  weekStart: Settings["weekStart"];
}) {
  const start = startOfWeek(today, weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const per = days.map((d) => {
    const list = activities.filter((a) => a.date === d);
    return {
      date: d,
      run: list.filter((a) => a.sport === "run").reduce((s, a) => s + a.distance, 0),
      ride: list.filter((a) => a.sport === "ride").reduce((s, a) => s + a.distance, 0),
      walk: list.filter((a) => a.sport === "walk").reduce((s, a) => s + a.distance, 0),
    };
  });
  const max = Math.max(1, ...per.map((d) => d.run + d.ride + d.walk));
  const labels = weekStart === "mon" ? LABELS_MON : LABELS_SUN;
  const H = 56;
  return (
    <div className="grid grid-cols-7 gap-2" role="img" aria-label="Distancia por día de esta semana">
      {per.map((d, i) => {
        const isToday = d.date === today;
        const future = d.date > today;
        const total = d.run + d.ride + d.walk;
        return (
          <div key={d.date} className="flex flex-col items-center gap-1.5" style={{ opacity: future ? 0.45 : 1 }}>
            <div className="flex w-full flex-col-reverse justify-start overflow-hidden rounded-md bg-surface-2" style={{ height: H }}>
              {total > 0 && (
                <>
                  <div style={{ height: `${(d.run / max) * 100}%`, background: "var(--run)", minHeight: d.run > 0 ? 3 : 0 }} />
                  <div style={{ height: `${(d.ride / max) * 100}%`, background: "var(--ride)", minHeight: d.ride > 0 ? 3 : 0 }} />
                  <div style={{ height: `${(d.walk / max) * 100}%`, background: "var(--walk)", minHeight: d.walk > 0 ? 3 : 0 }} />
                </>
              )}
            </div>
            <span className={`label ${isToday ? "font-semibold text-ink" : "text-ink-3"}`}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
