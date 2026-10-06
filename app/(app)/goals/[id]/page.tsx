"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { ActivityList, ActivityRow } from "@/components/activity-row";
import { EditGoalSheet } from "@/components/edit-goal-sheet";
import { statusColor } from "@/components/goal-card";
import { IconBack, IconBike, IconRun } from "@/components/icons";
import { PaceTrack } from "@/components/pace-track";
import { useScreenGate } from "@/components/screen-states";
import { useToast } from "@/components/toast";
import { TopBar } from "@/components/top-bar";
import { TrendChart } from "@/components/trend-chart";
import { useUi } from "@/components/ui-context";
import { Button, EmptyState, SectionTitle } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { formatMetric, formatMetricInline, shortDate } from "@/lib/format";
import { projectionText, requiredPerDay, statusText, timeLeftText } from "@/lib/goal-copy";
import { computeProgress, cumulativeSeries } from "@/lib/goals-progress";

export default function GoalDetailPage({ params }: PageProps<"/goals/[id]">) {
  const { id } = use(params);
  const gate = useScreenGate();
  const { goals, activities, settings, today, updateGoal, deleteGoal } = useData();
  const { openActivity } = useUi();
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const goal = goals.find((g) => g.id === id);
  const progress = useMemo(() => (goal && today ? computeProgress(goal, activities, today) : null), [goal, activities, today]);
  const series = useMemo(() => (goal && today ? cumulativeSeries(goal, activities, today) : []), [goal, activities, today]);
  const { units } = settings;

  const back = (
    <Link href="/goals" aria-label="Volver a Goals" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full active:bg-surface-2">
      <IconBack size={22} strokeWidth={1.75} aria-hidden />
    </Link>
  );

  if (gate) return (<><TopBar left={back} /><div className="pt-2">{gate}</div></>);
  if (!goal || !progress)
    return (
      <>
        <TopBar left={back} />
        <div className="pt-2">
          <EmptyState title="No encontramos este goal" body="Puede que lo hayas eliminado." action={<Link href="/goals" className="font-medium text-fern">Volver a Goals</Link>} />
        </div>
      </>
    );

  const cur = formatMetric(goal.metric, progress.current, units);
  const tgt = formatMetric(goal.metric, goal.target, units);
  const perDay = requiredPerDay(goal, progress);
  const projection = projectionText(goal, progress, units);
  const archived = goal.status === "archived";

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Algo salió mal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar
        left={back}
        right={
          <Button variant="text" onClick={() => setEditing(true)}>
            Editar
          </Button>
        }
      />
      <div className="enter space-y-8 pt-2">
        <header>
          <h1 className="title-l">{goal.title}</h1>
          <p className="body-s mt-1 flex items-center gap-1.5 text-ink-2">
            {goal.sport !== "ride" && <IconRun size={14} strokeWidth={1.75} aria-hidden />}
            {goal.sport !== "run" && <IconBike size={14} strokeWidth={1.75} aria-hidden />}
            {goal.sport === "run" ? "Correr" : goal.sport === "ride" ? "Bici" : "Correr y bici"} · {shortDate(goal.startDate)} – {shortDate(goal.endDate)}
            {archived && " · Archivado"}
          </p>
        </header>

        <section className="space-y-3" aria-label="Progreso">
          <div className="flex items-baseline gap-2">
            <span className="display-xl tnum">{cur.value}</span>
            <span className="text-xl font-medium text-ink-3">
              / {tgt.value} {tgt.unit}
            </span>
          </div>
          <PaceTrack progress={progress} thick showMarker={goal.metric !== "streak"} />
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium" style={{ color: statusColor(progress.state) }}>
              {statusText(goal, progress, units)}
            </span>
            <span className="body-s text-ink-2">{timeLeftText(goal, progress, today)}</span>
          </div>
          {(projection || perDay !== null) && (
            <div className="space-y-1 rounded-card bg-surface p-4">
              {projection && <p>{projection}.</p>}
              {perDay !== null && perDay > 0 && (
                <p className="text-ink-2">
                  Para llegar necesitas {formatMetricInline(goal.metric, perDay, units)} por día.
                </p>
              )}
            </div>
          )}
        </section>

        {series.length > 1 && (
          <section aria-label="Evolución">
            <SectionTitle>Evolución</SectionTitle>
            <div className="rounded-card bg-surface p-4">
              <TrendChart
                points={series.map((p) => ({ label: shortDate(p.date), value: p.value, ref: p.expected }))}
                format={(v) => formatMetricInline(goal.metric, v, units)}
                ariaLabel={`Progreso acumulado de ${goal.title} frente al ritmo necesario`}
              />
              <p className="label mt-2 text-ink-3">La línea punteada es el ritmo necesario para llegar al objetivo.</p>
            </div>
          </section>
        )}

        <section aria-label="Actividades que cuentan">
          <SectionTitle>Actividades que cuentan</SectionTitle>
          {progress.activities.length === 0 ? (
            <EmptyState title="Todavía ninguna" body="Las actividades de este periodo y deporte aparecerán aquí." />
          ) : (
            <ActivityList>
              {progress.activities.slice(0, 20).map((a) => (
                <ActivityRow key={a.id} activity={a} settings={settings} today={today} onOpen={openActivity} />
              ))}
            </ActivityList>
          )}
        </section>

        <section className="space-y-1" aria-label="Acciones">
          <Button
            variant="tonal"
            block
            disabled={busy}
            onClick={() => run(() => updateGoal(goal.id, { status: archived ? "active" : "archived" }), archived ? "Goal reactivado" : "Goal archivado")}
          >
            {archived ? "Reactivar goal" : "Archivar goal"}
          </Button>
          {!confirmDelete ? (
            <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
              Eliminar goal
            </Button>
          ) : (
            <div className="space-y-3 rounded-card bg-surface p-4" role="alertdialog" aria-label="Confirmar eliminación">
              <p>Se eliminará «{goal.title}». Tus actividades en Strava no cambian.</p>
              <div className="flex gap-3">
                <Button variant="tonal" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  block
                  disabled={busy}
                  className="!bg-danger !text-white"
                  onClick={() =>
                    run(async () => {
                      await deleteGoal(goal.id);
                      router.replace("/goals");
                    }, "Goal eliminado")
                  }
                >
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
      <EditGoalSheet goal={editing ? goal : null} onClose={() => setEditing(false)} />
    </>
  );
}
