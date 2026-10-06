"use client";

import { useEffect, useState } from "react";
import type { PartnerInfo, SharedDay } from "../types";

export interface PartnerData {
  partner: PartnerInfo;
  days: SharedDay[];
  stale: boolean;
  syncedAt: string | null;
}

type State = "idle" | "loading" | "ready" | "nolink" | "error";

// Caché breve en memoria para no repetir la petición al pasar entre Hoy y el reto.
const TTL_MS = 60_000;
let cache: { at: number; key: string; data: PartnerData } | null = null;

/** Totales por día y deporte de la persona vinculada. `key` cambia cuando cambia el vínculo. */
export function usePartnerDays(enabled: boolean, key: string | null): { state: State; data: PartnerData | null } {
  const [state, setState] = useState<State>("idle");
  const [data, setData] = useState<PartnerData | null>(null);

  useEffect(() => {
    if (!enabled || !key) {
      cache = null;
      return;
    }
    if (cache && cache.key === key && Date.now() - cache.at < TTL_MS) {
      // Resultado reciente ya en memoria: se reutiliza sin pedirlo otra vez.
      /* eslint-disable react-hooks/set-state-in-effect */
      setData(cache.data);
      setState("ready");
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    setState("loading");
    fetch("/api/versus")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) return setState("nolink");
        if (!res.ok) return setState("error");
        const body = (await res.json()) as PartnerData;
        cache = { at: Date.now(), key, data: body };
        setData(body);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [enabled, key]);

  return { state, data };
}
