"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { todayLocal } from "../dates";
import {
  DEFAULT_SETTINGS,
  type Activity,
  type AthleteInfo,
  type Goal,
  type ManualInput,
  type NewGoal,
  type PartnerInfo,
  type Settings,
} from "../types";

interface DataState {
  me: AthleteInfo | null;
  activities: Activity[];
  goals: Goal[];
  settings: Settings;
  /** Persona vinculada para el reto, o `null`. */
  partner: PartnerInfo | null;
  /** `false` si el servidor no tiene aún las tablas del vínculo: la interfaz oculta el reto. */
  linkAvailable: boolean;
  /** `false` si el servidor aún no tiene la tabla de actividades manuales: la interfaz oculta el "+". */
  manualAvailable: boolean;
  today: string;
  /** `loading` solo en la primera carga; después se refresca en segundo plano. */
  status: "loading" | "ready" | "error";
  stale: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: (force?: boolean) => Promise<void>;
  createGoal: (g: NewGoal) => Promise<Goal>;
  updateGoal: (id: string, patch: Partial<Pick<Goal, "title" | "target" | "status" | "sports" | "period" | "startDate" | "endDate">>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setSettings: (patch: Partial<Settings>) => void;
  addManual: (input: ManualInput) => Promise<Activity>;
  updateManual: (activity: Activity, input: ManualInput) => Promise<Activity>;
  deleteManual: (activity: Activity) => Promise<void>;
  createInvite: () => Promise<{ code: string; expiresAt: string }>;
  acceptInvite: (code: string) => Promise<PartnerInfo>;
  unlink: () => Promise<void>;
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
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [linkAvailable, setLinkAvailable] = useState(false);
  const [manualAvailable, setManualAvailable] = useState(false);
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
      const [m, a, g, l] = await Promise.all([
        api<AthleteInfo>("/api/me"),
        api<{ activities: Activity[]; stale: boolean; manualAvailable: boolean }>(`/api/activities${force ? "?refresh=1" : ""}`),
        api<{ goals: Goal[] }>("/api/goals"),
        // El vínculo es opcional: si falla no debe afectar al resto de la app.
        api<{ available: boolean; partner: PartnerInfo | null }>("/api/link").catch(() => ({ available: false, partner: null })),
      ]);
      setMe(m);
      setActivities(a.activities);
      setManualAvailable(a.manualAvailable);
      setStale(a.stale);
      setGoals(g.goals);
      setPartner(l.partner);
      setLinkAvailable(l.available);
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

  const addManual = useCallback(async (input: ManualInput) => {
    const { activity } = await api<{ activity: Activity }>("/api/manual", { method: "POST", body: JSON.stringify(input) });
    setActivities((prev) => [activity, ...prev]);
    return activity;
  }, []);

  const updateManual = useCallback(async (old: Activity, input: ManualInput) => {
    const { activity } = await api<{ activity: Activity }>(`/api/manual/${-old.id}`, { method: "PATCH", body: JSON.stringify(input) });
    setActivities((prev) => prev.map((a) => (a.id === old.id ? activity : a)));
    return activity;
  }, []);

  const deleteManual = useCallback(async (old: Activity) => {
    await api(`/api/manual/${-old.id}`, { method: "DELETE" });
    setActivities((prev) => prev.filter((a) => a.id !== old.id));
  }, []);

  const createInvite = useCallback(() => api<{ code: string; expiresAt: string }>("/api/link/invite", { method: "POST" }), []);

  const acceptInvite = useCallback(async (code: string) => {
    const { partner: p } = await api<{ partner: PartnerInfo }>("/api/link/accept", { method: "POST", body: JSON.stringify({ code }) });
    setPartner(p);
    return p;
  }, []);

  const unlink = useCallback(async () => {
    await api("/api/link", { method: "DELETE" });
    setPartner(null);
  }, []);

  const value = useMemo<DataState>(
    () => ({
      me, activities, goals, settings, partner, linkAvailable, manualAvailable, today, status, stale, error, refreshing,
      refresh, createGoal, updateGoal, deleteGoal, setSettings, addManual, updateManual, deleteManual, createInvite, acceptInvite, unlink,
    }),
    [me, activities, goals, settings, partner, linkAvailable, manualAvailable, today, status, stale, error, refreshing, refresh, createGoal, updateGoal, deleteGoal, setSettings, addManual, updateManual, deleteManual, createInvite, acceptInvite, unlink],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
