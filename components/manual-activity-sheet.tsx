"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays } from "@/lib/dates";
import { baseToInput, inputToBase, inputUnitLabel } from "@/lib/goal-copy";
import { MANUAL_WINDOW_DAYS, validateManual } from "@/lib/manual-validation";
import { useData } from "@/lib/client/data";
import { usePersisted } from "@/lib/client/use-persisted";
import { ALL_SPORTS, type Activity, type Sport } from "@/lib/types";
import { sportLabel } from "@/lib/format";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Chip, ChipGroup, Field, inputClass } from "./ui";

const num = (text: string) => Number(text.trim().replace(",", "."));
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

/** Agregar o editar una actividad a mano. Cuenta en goals, récords, Coach y el reto como cualquier otra. */
export function ManualActivitySheet({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  /** Si se pasa, el formulario edita esa actividad manual. */
  editing: Activity | null;
  onClose: () => void;
}) {
  const { settings, today, addManual, updateManual } = useData();
  const toast = useToast();
  const { units } = settings;
  // Recuerda el último deporte usado para no tener que elegirlo cada vez.
  const [lastSport, setLastSport] = usePersisted<Sport>("sg:manualSport", "walk");
  const [sport, setSport] = useState<Sport>("walk");
  const [date, setDate] = useState("");
  const [distanceText, setDistanceText] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [elevationText, setElevationText] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Se parte de cero al abrir, o de los valores de la actividad si se está editando.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (editing) {
      setSport(editing.sport);
      setDate(editing.date);
      setDistanceText(fmt(baseToInput("distance", editing.distance, units)));
      setHours(editing.movingTime >= 3600 ? String(Math.floor(editing.movingTime / 3600)) : "");
      setMinutes(editing.movingTime > 0 ? String(Math.round((editing.movingTime % 3600) / 60)) : "");
      setElevationText(editing.elevation > 0 ? fmt(baseToInput("elevation", editing.elevation, units)) : "");
      setName(editing.name);
    } else {
      setSport(lastSport);
      setDate(today);
      setDistanceText("");
      setHours("");
      setMinutes("");
      setElevationText("");
      setName("");
    }
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Solo al abrir o al cambiar de actividad: cambiar unidades con el formulario abierto no debe pisar lo escrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const draft = useMemo(() => {
    const h = hours.trim() ? num(hours) : 0;
    const m = minutes.trim() ? num(minutes) : 0;
    return {
      sport,
      date,
      distance: distanceText.trim() ? inputToBase("distance", num(distanceText), units) : NaN,
      movingTime: h * 3600 + m * 60,
      elevation: elevationText.trim() ? inputToBase("elevation", num(elevationText), units) : 0,
      name,
    };
  }, [sport, date, distanceText, hours, minutes, elevationText, name, units]);

  const check = useMemo(() => (today ? validateManual(draft, today) : null), [draft, today]);
  const touched = distanceText.trim().length > 0;

  const save = async () => {
    if (!check?.ok) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) await updateManual(editing, check.value);
      else await addManual(check.value);
      setLastSport(check.value.sport);
      toast(editing ? "Cambios guardados" : "Actividad agregada");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const problem = touched && check && !check.ok ? check.error : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Editar actividad" : "Agregar actividad"}
      footer={
        <Button block disabled={!check?.ok || saving} onClick={save}>
          {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar actividad"}
        </Button>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="label mb-2 text-ink-2">Deporte</p>
          <ChipGroup label="Deporte">
            {ALL_SPORTS.map((s) => (
              <Chip key={s} selected={sport === s} onClick={() => setSport(s)}>
                {sportLabel(s)}
              </Chip>
            ))}
          </ChipGroup>
        </div>

        <Field label={`Distancia en ${inputUnitLabel("distance", units)}`}>
          <input
            autoFocus={!editing}
            inputMode="decimal"
            value={distanceText}
            onChange={(e) => setDistanceText(e.target.value)}
            placeholder="0"
            className="display-l tnum h-20 w-full rounded-field bg-surface-2 px-4 text-ink outline-none placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fern"
          />
        </Field>

        <Field label="Fecha">
          <input
            type="date"
            value={date}
            max={today}
            min={today ? addDays(today, -MANUAL_WINDOW_DAYS) : undefined}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </Field>

        <div>
          <p className="label mb-1.5 text-ink-2">Tiempo (opcional)</p>
          <div className="grid grid-cols-2 gap-3">
            <input inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Horas" aria-label="Horas" className={inputClass} />
            <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minutos" aria-label="Minutos" className={inputClass} />
          </div>
          <p className="body-s mt-1.5 text-ink-3">Sin tiempo no se calcula el ritmo ni cuenta en goals de tiempo.</p>
        </div>

        <Field label={`Desnivel en ${inputUnitLabel("elevation", units)} (opcional)`}>
          <input inputMode="decimal" value={elevationText} onChange={(e) => setElevationText(e.target.value)} placeholder="0" className={inputClass} />
        </Field>

        <Field label="Nombre (opcional)">
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Actividad manual" className={inputClass} />
        </Field>

        <p className="body-s rounded-field bg-surface px-4 py-3 text-ink-2">
          Si la actividad ya está en Strava, no la agregues: se contaría dos veces.
        </p>

        {(problem || error) && (
          <p role="alert" className="text-danger">
            {error ?? problem}
          </p>
        )}
      </div>
    </Sheet>
  );
}
