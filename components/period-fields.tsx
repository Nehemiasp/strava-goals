"use client";

import { periodRange } from "@/lib/dates";
import { useData } from "@/lib/client/data";
import type { GoalPeriod } from "@/lib/types";
import { Chip, ChipGroup, Field, inputClass } from "./ui";

export interface When {
  period: GoalPeriod;
  startDate: string;
  endDate: string;
}

const PERIODS: { value: GoalPeriod; label: string }[] = [
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "year", label: "Este año" },
  { value: "custom", label: "Personalizado" },
];

/** Periodo del goal: atajos relativos a hoy o fechas exactas. Cambiar una fecha pasa a «Personalizado». */
export function PeriodFields({ value, onChange }: { value: When; onChange: (next: When) => void }) {
  const { today, settings } = useData();

  const pick = (period: GoalPeriod) => {
    if (period === "custom") return onChange({ ...value, period: "custom" });
    onChange({ period, ...periodRange(period, today, settings.weekStart) });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="label mb-2 text-ink-2">Periodo</p>
        <ChipGroup label="Periodo">
          {PERIODS.map((p) => (
            <Chip key={p.value} selected={value.period === p.value} onClick={() => pick(p.value)}>
              {p.label}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      {value.period === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde">
            <input
              type="date"
              value={value.startDate}
              onChange={(e) => onChange({ ...value, period: "custom", startDate: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              value={value.endDate}
              min={value.startDate}
              onChange={(e) => onChange({ ...value, period: "custom", endDate: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
