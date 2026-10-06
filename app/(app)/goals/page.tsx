"use client";

import { useMemo, useState } from "react";
import { GoalCard } from "@/components/goal-card";
import { IconPlus } from "@/components/icons";
import { SegmentedControl } from "@/components/segmented";
import { StaleNotice, useScreenGate } from "@/components/screen-states";
import { IconButton, TopBar } from "@/components/top-bar";
import { useUi } from "@/components/ui-context";
import { Button, EmptyState } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { isLive, withProgress } from "@/lib/client/selectors";

type Tab = "live" | "history";

export default function GoalsPage() {
  const gate = useScreenGate();
  const { goals, activities, settings, today } = useData();
  const { openCreateGoal } = useUi();
  const [tab, setTab] = useState<Tab>("live");

  const all = useMemo(() => withProgress(goals, activities, today), [goals, activities, today]);
  const live = useMemo(() => all.filter(isLive).sort((a, b) => (a.goal.endDate < b.goal.endDate ? -1 : 1)), [all]);
  const history = useMemo(() => all.filter((g) => !isLive(g)).sort((a, b) => (a.goal.endDate < b.goal.endDate ? 1 : -1)), [all]);
  const shown = tab === "live" ? live : history;

  return (
    <>
      <TopBar
        title="Goals"
        right={
          <IconButton label="Nuevo goal" onClick={openCreateGoal}>
            <IconPlus size={24} strokeWidth={1.75} aria-hidden />
          </IconButton>
        }
      />
      <div className="enter space-y-5 pt-2">
        <SegmentedControl<Tab>
          label="Estado de los goals"
          value={tab}
          onChange={setTab}
          options={[
            { value: "live", label: `Activos${live.length ? ` · ${live.length}` : ""}` },
            { value: "history", label: "Historial" },
          ]}
        />
        {gate ?? (
          <>
            <StaleNotice />
            {shown.length === 0 ? (
              tab === "live" ? (
                <EmptyState
                  title="Sin goals activos"
                  body="Define una meta y verás si vas por delante o por detrás de tu ritmo."
                  action={<Button onClick={openCreateGoal}>Crear goal</Button>}
                />
              ) : (
                <EmptyState title="Todavía no hay historial" body="Aquí aparecerán los goals que completes, venzan o archives." />
              )
            ) : (
              <div className="space-y-3.5">
                {shown.map(({ goal, progress }) => (
                  <GoalCard key={goal.id} goal={goal} progress={progress} settings={settings} today={today} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
