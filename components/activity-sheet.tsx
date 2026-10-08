"use client";

import { useState } from "react";
import { useData } from "@/lib/client/data";
import { distanceUnit, elevationUnit, formatDistance, formatDuration, formatElevation, formatPaceOrSpeed, longDate, sportLabel } from "@/lib/format";
import { isManual } from "@/lib/manual";
import type { Activity, Settings } from "@/lib/types";
import { IconExternal } from "./icons";
import { RouteGlyph } from "./route-glyph";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, StatBlock } from "./ui";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-field bg-surface px-4 py-3">
      <div className="label text-ink-2">{label}</div>
      <div className="title-m tnum mt-0.5">{value}</div>
    </div>
  );
}

export function ActivitySheet({
  activity: a,
  settings,
  onClose,
  onEdit,
}: {
  activity: Activity | null;
  settings: Settings;
  onClose: () => void;
  /** Abre el formulario de edición (solo para actividades manuales). */
  onEdit: (a: Activity) => void;
}) {
  const { units } = settings;
  const { deleteManual } = useData();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const manual = a !== null && isManual(a);

  const remove = async () => {
    if (!a) return;
    setBusy(true);
    try {
      await deleteManual(a);
      toast("Actividad eliminada");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <Sheet open={a !== null} onClose={onClose} title={a?.name ?? ""}>
      {a && (
        <div className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="label mb-1 text-ink-2">
                {sportLabel(a.sport)} · {longDate(a.date)}
                {manual && " · Manual"}
              </div>
              <StatBlock value={formatDistance(a.distance, units)} unit={distanceUnit(units)} size="l" />
            </div>
            <RouteGlyph polyline={a.polyline} sport={a.sport} show={settings.routeGlyphs} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Metric label="Tiempo en movimiento" value={formatDuration(a.movingTime)} />
            <Metric label={a.sport !== "ride" ? "Ritmo medio" : "Velocidad media"} value={formatPaceOrSpeed(a.sport, a.avgSpeed, units)} />
            <Metric label="Desnivel positivo" value={`${formatElevation(a.elevation, units)} ${elevationUnit(units)}`} />
            <Metric label="Frecuencia cardíaca" value={a.avgHr ? `${Math.round(a.avgHr)} ppm` : "–"} />
          </div>

          {manual ? (
            <div className="space-y-2">
              <p className="body-s text-ink-2">Agregada a mano: no viene de Strava, así que no trae frecuencia cardíaca ni ruta.</p>
              {!confirm ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="tonal" onClick={() => onEdit(a)}>
                    Editar
                  </Button>
                  <Button variant="danger" onClick={() => setConfirm(true)}>
                    Eliminar
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 rounded-card bg-surface p-4" role="alertdialog" aria-label="Confirmar eliminación">
                  <p>Se eliminará esta actividad y dejará de contar en tus goals y totales.</p>
                  <div className="flex gap-3">
                    <Button variant="tonal" onClick={() => setConfirm(false)} disabled={busy}>
                      Cancelar
                    </Button>
                    <Button block disabled={busy} className="!bg-danger !text-white" onClick={remove}>
                      {busy ? "Eliminando…" : "Eliminar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <a
              href={`https://www.strava.com/activities/${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 font-medium text-fern"
            >
              Ver en Strava <IconExternal size={18} strokeWidth={1.75} aria-hidden />
            </a>
          )}
        </div>
      )}
    </Sheet>
  );
}
