"use client";

import { useEffect, useState } from "react";
import { baseToInput, inputToBase, inputUnitLabel } from "@/lib/goal-copy";
import { useData } from "@/lib/client/data";
import type { Goal } from "@/lib/types";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Field, inputClass } from "./ui";

export function EditGoalSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { settings, updateGoal } = useData();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [targetText, setTargetText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!goal) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(goal.title);
    const v = baseToInput(goal.metric, goal.target, settings.units);
    setTargetText(String(Math.round(v * 100) / 100).replace(".", ","));
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [goal, settings.units]);

  const target = Number(targetText.replace(",", "."));
  const valid = title.trim().length > 0 && target > 0;

  const save = async () => {
    if (!goal) return;
    setSaving(true);
    setError(null);
    try {
      await updateGoal(goal.id, { title: title.trim(), target: inputToBase(goal.metric, target, settings.units) });
      toast("Cambios guardados");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={goal !== null}
      onClose={onClose}
      title="Editar goal"
      footer={
        <Button block disabled={!valid || saving} onClick={save}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      }
    >
      {goal && (
        <div className="space-y-5">
          <Field label="Título">
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </Field>
          <Field label={`Objetivo en ${inputUnitLabel(goal.metric, settings.units)}`} hint="Las fechas del goal no se pueden cambiar. Crea uno nuevo si necesitas otro periodo.">
            <input inputMode="decimal" value={targetText} onChange={(e) => setTargetText(e.target.value)} className={inputClass} />
          </Field>
          {error && <p role="alert" className="text-danger">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}
