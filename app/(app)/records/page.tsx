"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActivityList, ActivityRow } from "@/components/activity-row";
import { IconBack } from "@/components/icons";
import { useScreenGate } from "@/components/screen-states";
import { TopBar } from "@/components/top-bar";
import { useUi } from "@/components/ui-context";
import { EmptyState, SectionTitle, StatBlock } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { distanceUnit, formatDistance, formatDuration, formatPct, longDate, shortDate, sportLabel } from "@/lib/format";
import { longestStreak } from "@/lib/goals-progress";
import { bestPace, bestWeek, compareMonth, compareWeek, currentStreak, longestBySport, type Comparison } from "@/lib/records";
import type { Settings, Sport } from "@/lib/types";

const SPORT_ORDER: Sport[] = ["run", "ride", "walk"];

function CompareCard({ title, cmp, vs, units }: { title: string; cmp: Comparison; vs: string; units: Settings["units"] }) {
  const rows: [string, string, string][] = [
    ["Distancia", `${formatDistance(cmp.current.distance, units)} ${distanceUnit(units)}`, `${formatDistance(cmp.previous.distance, units)} ${distanceUnit(units)}`],
    ["Tiempo", formatDuration(cmp.current.movingTime), formatDuration(cmp.previous.movingTime)],
    ["Salidas", String(cmp.current.count), String(cmp.previous.count)],
  ];
  return (
    <div className="rounded-card bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="title-m">{title}</h3>
        {cmp.distancePct !== null && (
          <span className={`tnum font-semibold ${cmp.distancePct >= 0 ? "text-fern" : "text-ink-2"}`}>{formatPct(cmp.distancePct)}</span>
        )}
      </div>
      <p className="body-s mt-0.5 text-ink-2">Frente a {vs}, hasta el mismo punto.</p>
      <dl className="mt-3 space-y-2">
        <div className="label grid grid-cols-[1fr_auto_auto] gap-x-5 text-ink-3">
          <span />
          <span className="w-20 text-right">Ahora</span>
          <span className="w-20 text-right">Antes</span>
        </div>
        {rows.map(([label, now, before]) => (
          <div key={label} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-5">
            <dt className="text-ink-2">{label}</dt>
            <dd className="tnum w-20 text-right font-medium">{now}</dd>
            <dd className="tnum w-20 text-right text-ink-3">{before}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function RecordsPage() {
  const gate = useScreenGate();
  const { activities, settings, today } = useData();
  const { openActivity } = useUi();
  const { units, weekStart } = settings;

  const r = useMemo(() => {
    if (!today || activities.length === 0) return null;
    const dates = activities.map((a) => a.date);
    return {
      streak: currentStreak(dates, today),
      bestStreak: longestStreak(dates),
      week: bestWeek(activities, weekStart),
      longest: longestBySport(activities),
      pace: bestPace(activities),
      cmpWeek: compareWeek(activities, today, weekStart),
      cmpMonth: compareMonth(activities, today),
    };
  }, [activities, today, weekStart]);

  const back = (
    <Link href="/" aria-label="Volver a Hoy" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-surface-2">
      <IconBack size={22} strokeWidth={1.75} aria-hidden />
    </Link>
  );

  return (
    <>
      <TopBar left={back} />
      <div className="enter space-y-9 pt-2">
        <header>
          <h1 className="title-l">Récords y resumen</h1>
          <p className="body-s mt-1 text-ink-2">Calculado con tus actividades de los últimos 12 meses.</p>
        </header>

        {gate ??
          (!r ? (
            <EmptyState title="Aún no hay datos" body="Cuando tengas actividades de correr, bici o caminar, tus récords aparecerán aquí." />
          ) : (
            <>
              <section aria-label="Racha" className="space-y-1">
                <StatBlock
                  label="Racha actual"
                  value={String(r.streak)}
                  unit={r.streak === 1 ? "día seguido" : "días seguidos"}
                  size="xl"
                />
                <p className="text-ink-2">
                  {r.streak === 0
                    ? "Hoy y ayer sin salida. Una actividad hoy empieza una racha nueva."
                    : `Tu mejor racha del año es de ${r.bestStreak} ${r.bestStreak === 1 ? "día" : "días"}.`}
                </p>
              </section>

              {r.week && (
                <section aria-label="Mejor semana">
                  <SectionTitle>Mejor semana</SectionTitle>
                  <div className="rounded-card bg-surface p-5">
                    <StatBlock value={formatDistance(r.week.distance, units)} unit={distanceUnit(units)} size="l" />
                    <p className="mt-1 text-ink-2">
                      Semana del {shortDate(r.week.weekStart)} · {r.week.count} {r.week.count === 1 ? "salida" : "salidas"}
                    </p>
                  </div>
                </section>
              )}

              <section aria-label="Salida más larga">
                <SectionTitle>Salida más larga</SectionTitle>
                <ActivityList>
                  {SPORT_ORDER.filter((s) => r.longest[s]).map((s) => (
                    <ActivityRow key={s} activity={r.longest[s]!} settings={settings} today={today} onOpen={openActivity} />
                  ))}
                </ActivityList>
              </section>

              {r.pace && (
                <section aria-label="Mejor ritmo">
                  <SectionTitle>Mejor ritmo corriendo</SectionTitle>
                  <ActivityList>
                    <ActivityRow activity={r.pace} settings={settings} today={today} onOpen={openActivity} />
                  </ActivityList>
                  <p className="label mt-2 text-ink-3">
                    Entre las salidas de {formatDistance(5000, units, 0)} {distanceUnit(units)} o más ({sportLabel("run")}).
                  </p>
                </section>
              )}

              <section aria-label="Comparaciones" className="space-y-3.5">
                <SectionTitle>Frente al periodo anterior</SectionTitle>
                <CompareCard title="Esta semana" cmp={r.cmpWeek} vs="la semana pasada" units={units} />
                <CompareCard title="Este mes" cmp={r.cmpMonth} vs="el mes pasado" units={units} />
                <p className="label text-ink-3">Última actividad registrada: {longDate(activities.reduce((m, a) => (a.date > m ? a.date : m), ""))}.</p>
              </section>
            </>
          ))}
      </div>
    </>
  );
}
