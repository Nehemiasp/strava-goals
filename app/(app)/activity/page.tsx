"use client";

import { useMemo } from "react";
import { ActivityList, ActivityRow } from "@/components/activity-row";
import { IconPlus, IconRefresh } from "@/components/icons";
import { SegmentedControl } from "@/components/segmented";
import { StaleNotice, useScreenGate } from "@/components/screen-states";
import { IconButton, TopBar } from "@/components/top-bar";
import { useUi } from "@/components/ui-context";
import { EmptyState } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { latest } from "@/lib/client/selectors";
import { usePersisted } from "@/lib/client/use-persisted";
import { distanceUnit, formatDistance } from "@/lib/format";
import type { SportFilter } from "@/lib/types";

const TITLE: Record<SportFilter, string> = {
  all: "Últimas 10",
  run: "Últimas 10 · correr",
  ride: "Últimas 10 · bici",
  walk: "Últimas 10 · caminar",
};
const EMPTY_OF: Record<Exclude<SportFilter, "all">, string> = { run: "correr", ride: "bici", walk: "caminar" };

export default function ActivityPage() {
  const gate = useScreenGate();
  const { activities, settings, today, refresh, refreshing, manualAvailable } = useData();
  const { openActivity, openManual } = useUi();
  const [filter, setFilter] = usePersisted<SportFilter>("sg:filter", "all");
  const rows = useMemo(() => latest(activities, filter, 10), [activities, filter]);
  const total = rows.reduce((s, a) => s + a.distance, 0);

  return (
    <>
      <TopBar
        title="Actividad"
        right={
          <>
            {manualAvailable && (
              <IconButton label="Agregar actividad a mano" onClick={() => openManual()}>
                <IconPlus size={24} strokeWidth={1.75} aria-hidden />
              </IconButton>
            )}
            <IconButton label="Actualizar desde Strava" onClick={() => refresh(true)} spinning={refreshing}>
              <IconRefresh size={22} strokeWidth={1.75} aria-hidden />
            </IconButton>
          </>
        }
      />
      <div className="enter space-y-5 pt-2">
        <SegmentedControl<SportFilter>
          label="Filtrar por deporte"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Todo" },
            { value: "run", label: "Correr" },
            { value: "ride", label: "Bici" },
            { value: "walk", label: "Caminar" },
          ]}
        />
        {gate ?? (
          <>
            <StaleNotice />
            <div>
              <div className="label text-ink-2">{TITLE[filter]}</div>
              <div className="title-m tnum">
                {rows.length} {rows.length === 1 ? "salida" : "salidas"} · {formatDistance(total, settings.units)} {distanceUnit(settings.units)}
              </div>
            </div>
            {rows.length === 0 ? (
              <EmptyState
                title={filter === "all" ? "Sin actividades" : `Sin actividades de ${EMPTY_OF[filter]}`}
                body="Cuando registres una en Strava y la actualices aquí, aparecerá en esta lista."
              />
            ) : (
              <ActivityList>
                {rows.map((a) => (
                  <ActivityRow key={a.id} activity={a} settings={settings} today={today} onOpen={openActivity} />
                ))}
              </ActivityList>
            )}
          </>
        )}
      </div>
    </>
  );
}
