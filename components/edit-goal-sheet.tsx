"use client";

import { useEffect, useMemo, useState } from "react";
import { baseToInput, goalSentence, inputToBase, inputUnitLabel, suggestTitle } from "@/lib/goal-copy";
import { applyGoalPatch, type GoalPatch } from "@/lib/goal-validation";
import { useData } from "@/lib/client/data";
import type { Goal, GoalMetric, Sport } from "@/lib/types";
import { PeriodFields, type When } from "./period-fields";
import { Sheet } from "./sheet";
import { SportsPicker } from "./sports-picker";
import { useToast } from "./toast";
import { Button, Field, inputClass } from "./ui";

const METRIC_NAME: Record<GoalMetric, string> = {
  distance: "Distancia",
  time: "Tiempo",
  elevation: "Desnivel",
  count: "Frecuencia",
  streak: "Racha",
};

const sameSports = (a: readonly Sport[], b: readonly Sport[]) => a.length === b.length && a.every((s) => b.includes(s));

export function EditGoalSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { settings, updateGoal } = useData();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sports, setSports] = useState<Sport[]>([]);
  const [when, setWhen] = useState<When>({ period: "custom", startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!goal) return;
    // Se parte de los valores actuales del goal cada vez que se abre el editor.
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(goal.title);
    const v = baseToInput(goal.metric, goal.target, settings.units);
    setTargetText(String(Math.round(v * 100) / 100).replace(".", ","));
    setSports(goal.sports);
    // Se muestran las fechas exactas; los atajos (esta semana/mes/año) siguen disponibles.
    setWhen({ period: "custom", startDate: goal.startDate, endDate: goal.endDate });
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Solo al abrir otro goal; cambiar unidades con el editor abierto no debe pisar lo que se escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id]);

  const target = Number(targetText.replace(",", "."));
  const targetBase = goal && Number.isFinite(target) ? inputToBase(goal.metric, target, settings.units) : NaN;

  // Solo se envía lo que cambió.
  const patch = useMemo<GoalPatch>(() => {
    if (!goal) return {};
    const p: GoalPatch = {};
    if (title.trim() !== goal.title) p.title = title.trim();
    if (Number.isFinite(targetBase) && Math.abs(targetBase - goal.target) > 1e-6) p.target = targetBase;
    if (!sameSports(sports, goal.sports)) p.sports = sports;
    if (when.startDate !== goal.startDate || when.endDate !== goal.endDate) {
      p.startDate = when.startDate;
      p.endDate = when.endDate;
      p.period = when.period;
    }
    return p;
  }, [goal, title, targetBase, sports, when]);

  const changed = Object.keys(patch).length > 0;
  const hasInput = title.trim().length > 0 && target > 0 && Boolean(when.startDate) && Boolean(when.endDate);
  const check = useMemo(
    () => (goal && changed && hasInput ? applyGoalPatch(goal, patch) : null),
    [goal, patch, changed, hasInput],
  );
  const suggested =
    goal && targetBase > 0
      ? suggestTitle({ metric: goal.metric, sports, target: targetBase, period: when.period }, settings.units)
      : "";

  const save = async () => {
    if (!goal || !check?.ok) return;
    setSaving(true);
    setError(null);
    try {
      await updateGoal(goal.id, check.value);
      toast("Cambios guardados");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const problem = changed && hasInput && check && !check.ok ? check.error : null;

  return (
    <Sheet
      open={goal !== null}
      onClose={onClose}
      title="Editar goal"
      footer={
        <Button block disabled={!changed || !check?.ok || saving} onClick={save}>
          {saving ? "Guardando…" : changed ? "Guardar cambios" : "Sin cambios"}
        </Button>
      }
    >
      {goal && (
        <div className="space-y-6">
          <Field label="Título">
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          {suggested && suggested !== title.trim() && (
            <button
              type="button"
              onClick={() => setTitle(suggested)}
              className="-mt-3 min-h-11 text-left text-[0.9375rem] font-medium text-fern"
            >
              Usar el título sugerido: «{suggested}»
            </button>
          )}

          <Field
            label={`Objetivo en ${inputUnitLabel(goal.metric, settings.units)}`}
            hint={`Mide ${METRIC_NAME[goal.metric].toLowerCase()}. Para medir otra cosa, crea un goal nuevo.`}
          >
            <input inputMode="decimal" value={targetText} onChange={(e) => setTargetText(e.target.value)} className={inputClass} />
          </Field>

          <div>
            <p className="label mb-2 text-ink-2">Deportes que cuentan</p>
            <SportsPicker value={sports} onChange={setSports} />
          </div>

          <PeriodFields value={when} onChange={setWhen} />

          {changed && hasInput && check?.ok && (
            <p className="rounded-field bg-surface px-4 py-3 text-ink-2">
              {goalSentence(
                {
                  metric: goal.metric,
                  sports,
                  target: targetBase,
                  startDate: when.startDate,
                  endDate: when.endDate,
                },
                settings.units,
              )}
              .
            </p>
          )}
          {(problem || error) && (
            <p role="alert" className="text-danger">
              {error ?? problem}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
