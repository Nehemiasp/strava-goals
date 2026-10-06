"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActivityList, ActivityRow } from "@/components/activity-row";
import { GoalCard } from "@/components/goal-card";
import { IconChevron, IconPlus } from "@/components/icons";
import { useScreenGate, StaleNotice } from "@/components/screen-states";
import { TopBar } from "@/components/top-bar";
import { TrendChart } from "@/components/trend-chart";
import { useUi } from "@/components/ui-context";
import { Button, EmptyState, SectionTitle, StatBlock } from "@/components/ui";
import { WeekStrip } from "@/components/week-strip";
import { useData } from "@/lib/client/data";
import { isLive, latest, thisWeek, weeklyTrend, withProgress } from "@/lib/client/selectors";
import { usePartnerDays } from "@/lib/client/use-partner-days";
import { distanceUnit, formatDistance, formatMetricInline, formatPct } from "@/lib/format";
import { compareWeek } from "@/lib/records";
import { lead, toSharedDays, totals, windowFor } from "@/lib/versus";

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
  const { activities, goals, settings, today, partner, linkAvailable } = useData();
  const { openCreateGoal, openActivity, openSettings } = useUi();
  const { data: partnerData } = usePartnerDays(Boolean(partner) && Boolean(today), partner?.name ?? null);
  const { units } = settings;

  const week = useMemo(() => thisWeek(activities, today, settings.weekStart), [activities, today, settings.weekStart]);
  const trend = useMemo(() => weeklyTrend(activities, today, settings.weekStart, 8), [activities, today, settings.weekStart]);
  const live = useMemo(() => withProgress(goals, activities, today).filter(isLive), [goals, activities, today]);
  const featured = useMemo(() => [...live].sort((a, b) => b.progress.ratio - a.progress.ratio)[0], [live]);
  const recent = useMemo(() => latest(activities, "all", 3), [activities]);
  const cmp = useMemo(() => (today ? compareWeek(activities, today, settings.weekStart) : null), [activities, today, settings.weekStart]);
  // Reto de la semana (distancia, los tres deportes), para la tarjeta de Hoy.
  const versus = useMemo(() => {
    if (!partnerData || !today) return null;
    const f = { sports: ["run", "ride", "walk"] as const, metric: "distance" as const };
    const { from, to } = windowFor("week", today, settings.weekStart);
    const a = totals(toSharedDays(activities), f, from, to);
    const b = totals(partnerData.days, f, from, to);
    return { a, b, lead: lead(a, b) };
  }, [partnerData, today, activities, settings.weekStart]);

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
              {cmp && cmp.distancePct !== null && (
                <p className="body-s text-ink-2">
                  <span className={`tnum font-semibold ${cmp.distancePct >= 0 ? "text-fern" : "text-ink"}`}>{formatPct(cmp.distancePct)}</span>{" "}
                  frente a la semana pasada a este punto
                </p>
              )}
              <WeekStrip activities={activities} today={today} weekStart={settings.weekStart} />
              <div className="body-s flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
                {(
                  [
                    ["Correr", "bg-run", week.run],
                    ["Bici", "bg-ride", week.ride],
                    ["Caminar", "bg-walk", week.walk],
                  ] as const
                ).map(([label, dot, meters]) => (
                  <span key={label} className="flex items-center gap-2">
                    <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
                    {label} <span className="tnum font-medium text-ink">{formatDistance(meters, units)}</span>
                  </span>
                ))}
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

            {linkAvailable && (
              <section aria-label="Reto">
                {partner ? (
                  <Link href="/versus" className="block rounded-card bg-surface p-5 transition-transform active:scale-[0.99]">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="title-m">Tú vs. {partner.name.trim().split(/\s+/)[0]}</h2>
                      <IconChevron size={20} strokeWidth={1.75} className="text-ink-3" aria-hidden />
                    </div>
                    {versus ? (
                      <>
                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <StatBlock label="Tú" value={formatDistance(versus.a, units)} unit={distanceUnit(units)} size="m" color="var(--fern)" />
                          <StatBlock label={partner.name.trim().split(/\s+/)[0]} value={formatDistance(versus.b, units)} unit={distanceUnit(units)} size="m" align="right" />
                        </div>
                        <p className="body-s mt-2 text-ink-2">
                          {versus.lead.leader === "tie"
                            ? "Van empatados esta semana"
                            : versus.lead.leader === "me"
                              ? `Vas ${formatDistance(versus.lead.diff, units)} ${distanceUnit(units)} por delante esta semana`
                              : `${partner.name.trim().split(/\s+/)[0]} va ${formatDistance(versus.lead.diff, units)} ${distanceUnit(units)} por delante esta semana`}
                        </p>
                      </>
                    ) : (
                      <p className="body-s mt-2 text-ink-2">Cargando…</p>
                    )}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={openSettings}
                    className="flex min-h-14 w-full items-center justify-between gap-3 rounded-card bg-surface px-5 py-3 text-left active:bg-surface-2"
                  >
                    <span>
                      <span className="block font-medium">Reta a tu hermano</span>
                      <span className="body-s block text-ink-2">Comparen sus kilómetros de la semana</span>
                    </span>
                    <IconChevron size={20} strokeWidth={1.75} className="text-ink-3" aria-hidden />
                  </button>
                )}
              </section>
            )}

            <Link href="/records" className="flex min-h-14 items-center justify-between gap-3 rounded-card bg-surface px-5 py-3 active:bg-surface-2">
              <span>
                <span className="block font-medium">Récords y resumen</span>
                <span className="body-s block text-ink-2">Racha, mejor semana y comparaciones</span>
              </span>
              <IconChevron size={20} strokeWidth={1.75} className="text-ink-3" aria-hidden />
            </Link>

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
