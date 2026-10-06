"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ActivitySheet } from "./activity-sheet";
import { CreateGoalSheet } from "./create-goal-sheet";
import { SettingsSheet } from "./settings-sheet";
import { useData } from "@/lib/client/data";
import type { Activity } from "@/lib/types";

interface UiState {
  openSettings: () => void;
  openCreateGoal: () => void;
  openActivity: (a: Activity) => void;
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
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const closeActivity = useCallback(() => setActivity(null), []);

  const value = useMemo<UiState>(
    () => ({
      openSettings: () => setSettingsOpen(true),
      openCreateGoal: () => setCreateOpen(true),
      openActivity: setActivity,
    }),
    [],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <SettingsSheet open={settingsOpen} onClose={closeSettings} />
      <CreateGoalSheet open={createOpen} onClose={closeCreate} />
      <ActivitySheet activity={activity} settings={settings} onClose={closeActivity} />
    </Ctx.Provider>
  );
}
