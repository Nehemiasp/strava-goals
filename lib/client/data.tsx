"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { todayLocal } from "../dates";
import { DEFAULT_SETTINGS, type Activity, type AthleteInfo, type Goal, type NewGoal, type Settings } from "../types";

interface DataState {
  me: AthleteInfo | null;
  activities: Activity[];
  goals: Goal[];
  settings: Settings;
  today: string;
  /** `loading` solo en la primera carga; después se refresca en segundo plano. */
  status: "loading" | "ready" | "error";
  stale: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: (force?: boolean) => Promise<void>;
  createGoal: (g: NewGoal) => Promise<Goal>;
  updateGoal: (id: string, patch: Partial<Pick<Goal, "title" | "target" | "status">>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setSettings: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<DataState | null>(null);

export function useData(): DataState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData debe usarse dentro de <DataProvider>");
  return v;
}

const SETTINGS_KEY = "sg:settings";

function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Recarga completa a propósito: la sesión es inválida y hay que descartar el estado.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/connect?error=session");
    throw new ApiError(401, "Sesión caducada");
  }
  if (!res.ok) throw new ApiError(res.status, body.error ?? "Algo salió mal");
  return body as T;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AthleteInfo | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [today, setToday] = useState("");
  const [status, setStatus] = useState<DataState["status"]>("loading");
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inflight = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (inflight.current) return;
    inflight.current = true;
    setRefreshing(true);
    try {
      const [m, a, g] = await Promise.all([
        api<AthleteInfo>("/api/me"),
        api<{ activities: Activity[]; stale: boolean }>(`/api/activities${force ? "?refresh=1" : ""}`),
        api<{ goals: Goal[] }>("/api/goals"),
      ]);
      setMe(m);
      setActivities(a.activities);
      setStale(a.stale);
      setGoals(g.goals);
      setToday(todayLocal());
      setError(null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setStatus((s) => (s === "ready" ? "ready" : "error"));
    } finally {
      inflight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Los ajustes viven en localStorage: solo existen en el cliente tras el montaje.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsState(loadSettings());
    void refresh();
    // Al volver a la app (PWA en segundo plano) se refresca, y se recalcula "hoy".
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* almacenamiento bloqueado: el ajuste vale solo para esta sesión */
      }
      if (patch.theme !== undefined) {
        if (next.theme === "auto") delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = next.theme;
      }
      return next;
    });
  }, []);

  const createGoal = useCallback(async (g: NewGoal) => {
    const { goal } = await api<{ goal: Goal }>("/api/goals", { method: "POST", body: JSON.stringify(g) });
    setGoals((prev) => [goal, ...prev]);
    return goal;
  }, []);

  const updateGoal = useCallback<DataState["updateGoal"]>(async (id, patch) => {
    const { goal } = await api<{ goal: Goal }>(`/api/goals/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    setGoals((prev) => prev.map((x) => (x.id === id ? goal : x)));
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    await api(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const value = useMemo<DataState>(
    () => ({ me, activities, goals, settings, today, status, stale, error, refreshing, refresh, createGoal, updateGoal, deleteGoal, setSettings }),
    [me, activities, goals, settings, today, status, stale, error, refreshing, refresh, createGoal, updateGoal, deleteGoal, setSettings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
