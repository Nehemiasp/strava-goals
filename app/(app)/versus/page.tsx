"use client";

import Link from "next/link";
import { useMemo } from "react";
import { IconBack } from "@/components/icons";
import { SegmentedControl } from "@/components/segmented";
import { useScreenGate } from "@/components/screen-states";
import { SportsPicker } from "@/components/sports-picker";
import { TopBar } from "@/components/top-bar";
import { TrendChart } from "@/components/trend-chart";
import { useUi } from "@/components/ui-context";
import { Button, Chip, ChipGroup, EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { usePartnerDays } from "@/lib/client/use-partner-days";
import { usePersisted } from "@/lib/client/use-persisted";
import { agoLabel, formatMetric, formatMetricInline, shortDate } from "@/lib/format";
import { ALL_SPORTS, type Sport, type VersusMetric } from "@/lib/types";
import { cumulativeBoth, lead, toSharedDays, totals, weeklyWins, windowFor } from "@/lib/versus";

interface Prefs {
  period: "week" | "month";
  metric: VersusMetric;
  sports: Sport[];
}
const DEFAULT_PREFS: Prefs = { period: "week", metric: "distance", sports: [...ALL_SPORTS] };

const METRICS: { value: VersusMetric; label: string }[] = [
  { value: "distance", label: "Distancia" },
  { value: "time", label: "Tiempo" },
  { value: "elevation", label: "Desnivel" },
  { value: "count", label: "Salidas" },
];

const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;

export default function VersusPage() {
  const gate = useScreenGate();
  const { activities, settings, today, linkAvailable, partner: linked } = useData();
  const { openSettings } = useUi();
  const [prefs, setPrefs] = usePersisted<Prefs>("sg:versus", DEFAULT_PREFS);
  const { state: loadState, data } = usePartnerDays(Boolean(linked), linked?.name ?? null);
  const state = loadState === "idle" ? "loading" : loadState;

  const mine = useMemo(() => toSharedDays(activities), [activities]);
  const { units, weekStart } = settings;
  const filter = useMemo(() => ({ sports: prefs.sports, metric: prefs.metric }), [prefs.sports, prefs.metric]);

  const view = useMemo(() => {
    if (!data || !today) return null;
    const { from, to } = windowFor(prefs.period, today, weekStart);
    const a = totals(mine, filter, from, to);
    const b = totals(data.days, filter, from, to);
    return {
      a,
      b,
      lead: lead(a, b),
      series: cumulativeBoth(mine, data.days, filter, from, to, today),
      wins: weeklyWins(mine, data.days, filter, today, weekStart, 8),
    };
  }, [data, today, prefs.period, weekStart, mine, filter]);

  const back = (
    <Link href="/" aria-label="Volver a Hoy" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-surface-2">
      <IconBack size={22} strokeWidth={1.75} aria-hidden />
    </Link>
  );

  if (gate) return (<><TopBar left={back} /><div className="pt-2">{gate}</div></>);

  if (!linkAvailable || !linked || state === "nolink") {
    return (
      <>
        <TopBar left={back} />
        <div className="pt-2">
          <EmptyState
            title="Aún no estás vinculado"
            body="Vincúlate con tu hermano con un código de invitación y comparen sus kilómetros de la semana."
            action={<Button onClick={openSettings}>Abrir Ajustes</Button>}
          />
        </div>
      </>
    );
  }

  const name = firstName(linked.name);
  const fmt = (base: number) => formatMetric(prefs.metric, base, units);
  const total = (view?.a ?? 0) + (view?.b ?? 0);
  const pctMine = total > 0 && view ? (view.a / total) * 100 : 0;
  const sentence = !view
    ? ""
    : view.lead.leader === "tie"
      ? view.a === 0
        ? "Todavía no hay actividad en este periodo"
        : "Van empatados"
      : view.lead.leader === "me"
        ? `Vas ${formatMetricInline(prefs.metric, view.lead.diff, units)} por delante de ${name}`
        : `${name} va ${formatMetricInline(prefs.metric, view.lead.diff, units)} por delante`;

  return (
    <>
      <TopBar left={back} />
      <div className="enter space-y-7 pt-2">
        <header>
          <h1 className="title-l">Tú vs. {name}</h1>
          {data?.syncedAt && <p className="body-s mt-1 text-ink-2">Datos de {name} actualizados {agoLabel(data.syncedAt)}</p>}
        </header>

        <SegmentedControl<"week" | "month">
          label="Periodo"
          value={prefs.period}
          onChange={(period) => setPrefs((p) => ({ ...p, period }))}
          options={[
            { value: "week", label: "Esta semana" },
            { value: "month", label: "Este mes" },
          ]}
        />

        <div className="space-y-4">
          <ChipGroup label="Qué comparar">
            {METRICS.map((m) => (
              <Chip key={m.value} selected={prefs.metric === m.value} onClick={() => setPrefs((p) => ({ ...p, metric: m.value }))}>
                {m.label}
              </Chip>
            ))}
          </ChipGroup>
          <SportsPicker value={prefs.sports} onChange={(sports) => setPrefs((p) => ({ ...p, sports }))} label="Deportes que cuentan" />
        </div>

        {state === "loading" && <Skeleton className="h-40 w-full" />}
        {state === "error" && (
          <EmptyState title={`No pudimos cargar los datos de ${name}`} body="Inténtalo de nuevo en un momento." action={<Button onClick={() => location.reload()}>Reintentar</Button>} />
        )}

        {state === "ready" && data && view && (
          <>
            {data.stale && (
              <p className="body-s rounded-field bg-surface px-4 py-3 text-ink-2">
                No pudimos actualizar los datos de {name}. Mostramos lo último que teníamos.
              </p>
            )}

            <section aria-label="Comparación" className="space-y-4 rounded-card bg-surface p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="label font-semibold text-fern">Tú</div>
                  <div className="flex items-baseline gap-1">
                    <span className="display-l tnum">{fmt(view.a).value}</span>
                    <span className="font-medium text-ink-3">{fmt(view.a).unit}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="label truncate font-semibold text-ink-2">{name}</div>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="display-l tnum">{fmt(view.b).value}</span>
                    <span className="font-medium text-ink-3">{fmt(view.b).unit}</span>
                  </div>
                </div>
              </div>
              <div
                role="img"
                aria-label={`${pctMine.toFixed(0)} % para ti y ${(total > 0 ? 100 - pctMine : 0).toFixed(0)} % para ${name}`}
                className="flex h-3 overflow-hidden rounded-full bg-surface-2"
              >
                {total > 0 && (
                  <>
                    <div style={{ width: `${pctMine}%`, background: "var(--fern)" }} />
                    <div style={{ width: `${100 - pctMine}%`, background: "var(--ink-2)" }} />
                  </>
                )}
              </div>
              <p className="font-medium">{sentence}</p>
            </section>

            {view.series.length > 1 && (
              <section aria-label="Evolución">
                <SectionTitle>Evolución</SectionTitle>
                <div className="rounded-card bg-surface p-4">
                  <TrendChart
                    points={view.series.map((p) => ({ label: shortDate(p.date), value: p.mine, other: p.theirs }))}
                    format={(v) => formatMetricInline(prefs.metric, v, units)}
                    names={{ mine: "Tú", other: name }}
                    ariaLabel={`Acumulado de ti y de ${name} en este periodo`}
                  />
                  <div className="body-s mt-2 flex gap-5 text-ink-2">
                    <span className="flex items-center gap-2"><span aria-hidden className="h-0.5 w-4 rounded-full bg-fern" />Tú</span>
                    <span className="flex items-center gap-2"><span aria-hidden className="h-0.5 w-4 rounded-full bg-ink-2" />{name}</span>
                  </div>
                </div>
              </section>
            )}

            <section aria-label="Últimas 8 semanas">
              <SectionTitle>Últimas 8 semanas</SectionTitle>
              <div className="space-y-3 rounded-card bg-surface p-5">
                <p className="tnum">
                  <span className="font-semibold text-fern">Tú {view.wins.mine}</span>
                  <span className="text-ink-3"> · </span>
                  <span className="font-semibold">{name} {view.wins.theirs}</span>
                  {view.wins.ties > 0 && <span className="text-ink-2"> · {view.wins.ties} {view.wins.ties === 1 ? "empate" : "empates"}</span>}
                </p>
                <div className="grid grid-cols-8 gap-1.5" role="img" aria-label="Quién ganó cada semana, de la más antigua a la más reciente">
                  {view.wins.weeks.map((w) => {
                    const l = lead(w.mine, w.theirs);
                    const empty = w.mine === 0 && w.theirs === 0;
                    return (
                      <div
                        key={w.weekStart}
                        title={`Semana del ${shortDate(w.weekStart)}`}
                        className="h-8 rounded-md"
                        style={{ background: empty || l.leader === "tie" ? "var(--surface-2)" : l.leader === "me" ? "var(--fern)" : "var(--ink-2)" }}
                      />
                    );
                  })}
                </div>
                <p className="label text-ink-3">Verde: ganaste tú · gris oscuro: ganó {name} · claro: empate o sin actividad.</p>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
