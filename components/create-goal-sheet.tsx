"use client";

import { useEffect, useMemo, useState } from "react";
import { periodRange } from "@/lib/dates";
import { goalSentence, inputToBase, inputUnitLabel, suggestTitle } from "@/lib/goal-copy";
import { validateNewGoal } from "@/lib/goal-validation";
import { useData } from "@/lib/client/data";
import type { GoalMetric, GoalPeriod, NewGoal, Sport } from "@/lib/types";
import { IconChevron } from "./icons";
import { Sheet } from "./sheet";
import { SportsPicker } from "./sports-picker";
import { useToast } from "./toast";
import { Button, Chip, ChipGroup, Field, inputClass } from "./ui";

const METRICS: { value: GoalMetric; title: string; hint: string }[] = [
  { value: "distance", title: "Distancia", hint: "Acumular kilómetros" },
  { value: "count", title: "Frecuencia", hint: "Número de salidas" },
  { value: "time", title: "Tiempo", hint: "Horas en movimiento" },
  { value: "elevation", title: "Desnivel", hint: "Metros de subida" },
  { value: "streak", title: "Racha", hint: "Días seguidos entrenando" },
];

const TEMPLATES: { label: string; metric: GoalMetric; sports: Sport[]; period: Exclude<GoalPeriod, "custom">; target: number }[] = [
  { label: "100 km corriendo al mes", metric: "distance", sports: ["run"], period: "month", target: 100 },
  { label: "30 km caminando al mes", metric: "distance", sports: ["walk"], period: "month", target: 30 },
  { label: "3 salidas por semana", metric: "count", sports: ["run", "ride", "walk"], period: "week", target: 3 },
  { label: "200 km en bici al mes", metric: "distance", sports: ["ride"], period: "month", target: 200 },
  { label: "7 días seguidos", metric: "streak", sports: ["run", "ride", "walk"], period: "month", target: 7 },
];

const PERIODS: { value: GoalPeriod; label: string }[] = [
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "year", label: "Este año" },
  { value: "custom", label: "Personalizado" },
];

export function CreateGoalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, today, createGoal } = useData();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [metric, setMetric] = useState<GoalMetric>("distance");
  const [sports, setSports] = useState<Sport[]>(["run"]);
  const [targetText, setTargetText] = useState("");
  const [period, setPeriod] = useState<GoalPeriod>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Cada vez que se abre, se parte de cero.
    /* eslint-disable react-hooks/set-state-in-effect */
    setStep(1);
    setMetric("distance");
    setSports(["run"]);
    setTargetText("");
    setPeriod("month");
    setCustomStart(today);
    setCustomEnd(today);
    setTitle("");
    setTitleTouched(false);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, today]);

  const target = Number(targetText.replace(",", "."));
  const range = useMemo(
    () => (period === "custom" ? { startDate: customStart, endDate: customEnd } : periodRange(period, today, settings.weekStart)),
    [period, customStart, customEnd, today, settings.weekStart],
  );
  const base = Number.isFinite(target) ? inputToBase(metric, target, settings.units) : NaN;
  const draft: NewGoal = {
    title: title.trim(),
    metric,
    sports,
    target: base,
    period,
    ...range,
  };
  const suggested = Number.isFinite(base) && base > 0 ? suggestTitle({ metric, sports, target: base, period }, settings.units) : "";
  const shownTitle = titleTouched ? title : suggested;
  const check = validateNewGoal({ ...draft, title: shownTitle });

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setMetric(t.metric);
    setSports(t.sports);
    setPeriod(t.period);
    setTargetText(String(t.target));
    setTitleTouched(false);
    setStep(3);
  };

  const save = async () => {
    if (!check.ok) return setError(check.error);
    setSaving(true);
    setError(null);
    try {
      await createGoal(check.value);
      toast("Goal creado");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el goal");
    } finally {
      setSaving(false);
    }
  };

  const footer =
    step === 1 ? undefined : (
      <div className="flex gap-3">
        <Button variant="tonal" onClick={() => setStep((s) => (s === 3 ? 2 : 1))}>
          Atrás
        </Button>
        {step === 2 ? (
          <Button block disabled={!(target > 0)} onClick={() => setStep(3)}>
            Continuar
          </Button>
        ) : (
          <Button block disabled={saving || !check.ok} onClick={save}>
            {saving ? "Guardando…" : "Crear goal"}
          </Button>
        )}
      </div>
    );

  return (
    <Sheet open={open} onClose={onClose} title={step === 1 ? "Nuevo goal" : step === 2 ? "¿Cuánto?" : "¿Cuándo?"} footer={footer}>
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <p className="label mb-2 text-ink-2">Plantillas</p>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="min-h-11 shrink-0 rounded-full bg-surface-2 px-4 text-[0.9375rem] font-medium active:opacity-80"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label mb-2 text-ink-2">O elige qué medir</p>
            <div className="overflow-hidden rounded-card bg-surface py-1.5">
              {METRICS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setMetric(m.value);
                    setStep(2);
                  }}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-left active:bg-surface-2"
                >
                  <span>
                    <span className="block font-medium">{m.title}</span>
                    <span className="body-s block text-ink-2">{m.hint}</span>
                  </span>
                  <IconChevron size={20} strokeWidth={1.75} className="text-ink-3" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-7">
          <Field label={`Objetivo en ${inputUnitLabel(metric, settings.units)}`}>
            <input
              autoFocus
              inputMode="decimal"
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder="0"
              className="display-l tnum h-20 w-full rounded-field bg-surface-2 px-4 text-ink outline-none placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fern"
            />
          </Field>
          <div>
            <p className="label mb-2 text-ink-2">Deportes que cuentan</p>
            <SportsPicker value={sports} onChange={setSports} />
            <p className="body-s mt-2 text-ink-3">Puedes combinar los que quieras.</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <p className="label mb-2 text-ink-2">Periodo</p>
            <ChipGroup label="Periodo">
              {PERIODS.map((p) => (
                <Chip key={p.value} selected={period === p.value} onClick={() => setPeriod(p.value)}>
                  {p.label}
                </Chip>
              ))}
            </ChipGroup>
          </div>
          {period === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Hasta">
                <input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} className={inputClass} />
              </Field>
            </div>
          )}
          <Field label="Título">
            <input
              value={shownTitle}
              maxLength={80}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              className={inputClass}
            />
          </Field>
          {Number.isFinite(base) && base > 0 && range.startDate && range.endDate && range.endDate >= range.startDate && (
            <p className="rounded-field bg-surface px-4 py-3 text-ink-2">{goalSentence({ metric, sports, target: base, ...range }, settings.units)}.</p>
          )}
          {(error || (!check.ok && target > 0)) && (
            <p role="alert" className="text-danger">
              {error ?? (check.ok ? "" : check.error)}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}

