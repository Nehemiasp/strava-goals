"use client";

import { useCallback, useEffect, useState } from "react";

/** Estado guardado en localStorage. Siempre arranca con `initial` para no romper la hidratación. */
export function usePersisted<T>(
  key: string,
  initial: T,
  /** Adapta valores guardados por versiones anteriores al formato actual. */
  migrate?: (raw: unknown) => Partial<T>,
): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        const patch = migrate ? migrate(parsed) : parsed;
        // localStorage solo existe en el cliente: se lee tras el montaje para no romper la hidratación.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue((prev) => (typeof prev === "object" && prev !== null ? { ...prev, ...(patch as object) } : (patch as T)));
      }
    } catch {
      /* valor corrupto o almacenamiento bloqueado: se usa el inicial */
    }
    // `migrate` es una función estable de módulo; no debe reejecutar el efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
