"use client";

import { useData } from "@/lib/client/data";
import { Button, EmptyState, Skeleton } from "./ui";

export function ScreenSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-16 w-2/3" />
      <Skeleton className="h-28 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[76px] w-full" />
      ))}
    </div>
  );
}

/** Estado común para cargando / error. Devuelve `null` cuando los datos están listos. */
export function useScreenGate(): React.ReactNode | null {
  const { status, error, refresh } = useData();
  if (status === "loading") return <ScreenSkeleton />;
  if (status === "error")
    return (
      <EmptyState
        title="No pudimos cargar tus datos"
        body={error ?? "Revisa tu conexión e inténtalo de nuevo."}
        action={<Button onClick={() => refresh(true)}>Reintentar</Button>}
      />
    );
  return null;
}

export function StaleNotice() {
  const { stale } = useData();
  if (!stale) return null;
  return (
    <p className="body-s mb-4 rounded-field bg-surface px-4 py-3 text-ink-2">
      Strava no respondió. Mostramos los últimos datos guardados.
    </p>
  );
}
