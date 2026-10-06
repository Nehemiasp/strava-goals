"use client";

import { useCallback, useEffect, useState } from "react";

/** Estado guardado en localStorage. Siempre arranca con `initial` para no romper la hidratación. */
export function usePersisted<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw !== null) setValue((prev) => (typeof prev === "object" && prev !== null ? { ...prev, ...JSON.parse(raw) } : JSON.parse(raw)));
    } catch {
      /* valor corrupto o almacenamiento bloqueado: se usa el inicial */
    }
  }, [key]);

  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* sin persistencia */
        }
        return next;
      });
    },
    [key],
  );
  return [value, set];
}
