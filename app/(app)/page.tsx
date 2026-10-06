"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActivityList, ActivityRow } from "@/components/activity-row";
import { GoalCard } from "@/components/goal-card";
import { IconPlus } from "@/components/icons";
import { useScreenGate, StaleNotice } from "@/components/screen-states";
import { TopBar } from "@/components/top-bar";
import { TrendChart } from "@/components/trend-chart";
import { useUi } from "@/components/ui-context";
import { Button, EmptyState, SectionTitle, StatBlock } from "@/components/ui";
import { WeekStrip } from "@/components/week-strip";
import { useData } from "@/lib/client/data";
import { isLive, latest, thisWeek, weeklyTrend, withProgress } from "@/lib/client/selectors";
import { distanceUnit, formatDistance, formatMetricInline } from "@/lib/format";

function Avatar() {
  const { me } = useData();
  const { openSettings } = useUi();
  return (
    <button
      type="button"
      onClick={openSettings}
      aria-label="Ajustes"
      className="flex h-11 w-11 items-center justify-center rounded-full"
    >
      {me?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={me.avatar} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="title-m flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-base">
          {me?.name.charAt(0) ?? ""}
        </span>
      )}
    </button>
  );
}

export default function HoyPage() {
  const gate = useScreenGate();
  const { activities, goals, settings, today } = useData();
  const { openCreateGoal, openActivity } = useUi();
  const { units } = settings;

  const week = useMemo(() => thisWeek(activities, today, settings.weekStart), [activities, today, settings.weekStart]);
  const trend = useMemo(() => weeklyTrend(activities, today, settings.weekStart, 8), [activities, today, settings.weekStart]);
  const live = useMemo(() => withProgress(goals, activities, today).filter(isLive), [goals, activities, today]);
  const featured = useMemo(() => [...live].sort((a, b) => b.progress.ratio - a.progress.ratio)[0], [live]);
  const recent = useMemo(() => latest(activities, "all", 3), [activities]);

  return (
    <>
      <TopBar title="Hoy" right={<Avatar />} />
      <div className="enter pt-2">
        {gate ?? (
          <div className="space-y-9">
            <StaleNotice />
            <section aria-label="Esta semana" className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <StatBlock label="Esta semana" value={formatDistance(week.total, units)} unit={distanceUnit(units)} size="xl" />
                <div className="pb-2 text-right">
                  <div className="title-m tnum">{week.count}</div>
                  <div className="label text-ink-2">{week.count === 1 ? "salida" : "salidas"}</div>
                </div>
              </div>
              <WeekStrip activities={activities} today={today} weekStart={settings.weekStart} />
              <div className="flex gap-5 body-s text-ink-2">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-run" />
                  Correr <span className="tnum font-medium text-ink">{formatDistance(week.run, units)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-ride" />
                  Bici <span className="tnum font-medium text-ink">{formatDistance(week.ride, units)}</span>
                </span>
              </div>
            </section>

            <section aria-label="Goal más cercano">
              <SectionTitle>{featured ? "Goal más cercano" : "Tus goals"}</SectionTitle>
              {featured ? (
                <GoalCard goal={featured.goal} progress={featured.progress} settings={settings} today={today} />
              ) : (
                <EmptyState
                  title="Aún no tienes goals activos"
                  body="Crea una meta de distancia, tiempo o frecuencia y la medimos con tus actividades."
                  action={
                    <Button onClick={openCreateGoal}>
                      <IconPlus size={20} strokeWidth={1.75} aria-hidden /> Crear goal
                    </Button>
                  }
                />
              )}
            </section>

            <section aria-label="Últimas salidas">
              <SectionTitle
                action={
                  <Link href="/activity" className="min-h-11 content-center text-[0.9375rem] font-medium text-fern">
                    Ver todo
                  </Link>
                }
              >
                Últimas salidas
              </SectionTitle>
              {recent.length === 0 ? (
                <EmptyState title="Sin actividades todavía" body="Cuando registres una salida de correr o bici en Strava, aparecerá aquí." />
              ) : (
                <ActivityList>
                  {recent.map((a) => (
                    <ActivityRow key={a.id} activity={a} settings={settings} today={today} onOpen={openActivity} />
                  ))}
                </ActivityList>
              )}
            </section>

            <section aria-label="Tendencia">
              <SectionTitle>Últimas 8 semanas</SectionTitle>
              <div className="rounded-card bg-surface p-4">
                <TrendChart
                  points={trend}
                  format={(v) => formatMetricInline("distance", v, units)}
                  ariaLabel="Distancia semanal de las últimas 8 semanas"
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
