"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ActivitySheet } from "./activity-sheet";
import { ManualActivitySheet } from "./manual-activity-sheet";
import { CreateGoalSheet } from "./create-goal-sheet";
import { SettingsSheet } from "./settings-sheet";
import { useData } from "@/lib/client/data";
import type { Activity } from "@/lib/types";

interface UiState {
  openSettings: () => void;
  openCreateGoal: () => void;
  openActivity: (a: Activity) => void;
  /** Abre el formulario para agregar una actividad manual, o para editar una si se pasa. */
  openManual: (editing?: Activity) => void;
}

const Ctx = createContext<UiState | null>(null);
export const useUi = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUi debe usarse dentro de <UiProvider>");
  return v;
};

/** Aloja los sheets globales para que cualquier pantalla pueda abrirlos. */
export function UiProvider({ children }: { children: ReactNode }) {
  const { settings } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEditing, setManualEditing] = useState<Activity | null>(null);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const closeActivity = useCallback(() => setActivity(null), []);
  const closeManual = useCallback(() => setManualOpen(false), []);

  const value = useMemo<UiState>(
    () => ({
      openSettings: () => setSettingsOpen(true),
      openCreateGoal: () => setCreateOpen(true),
      openActivity: setActivity,
      openManual: (editing) => {
        setManualEditing(editing ?? null);
        if (!editing) return setManualOpen(true);
        // Se venía del detalle: al cerrarlo, ese sheet hace `history.back()`. Si el formulario se abriera en el mismo
        // instante, ese retroceso lo cerraría; por eso se abre cuando el historial ya se asentó.
        setActivity(null);
        setTimeout(() => setManualOpen(true), 120);
      },
    }),
    [],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <SettingsSheet open={settingsOpen} onClose={closeSettings} />
      <CreateGoalSheet open={createOpen} onClose={closeCreate} />
      <ActivitySheet activity={activity} settings={settings} onClose={closeActivity} onEdit={(a) => value.openManual(a)} />
      <ManualActivitySheet open={manualOpen} editing={manualEditing} onClose={closeManual} />
    </Ctx.Provider>
  );
}
