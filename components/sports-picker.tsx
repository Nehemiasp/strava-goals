"use client";

import { sportLabel } from "@/lib/format";
import { ALL_SPORTS, type Sport } from "@/lib/types";
import { IconBike, IconRun, IconWalk } from "./icons";

const ICON = { run: IconRun, ride: IconBike, walk: IconWalk } as const;

/** Selección múltiple de deportes. Siempre queda al menos uno activo. */
export function SportsPicker({
  value,
  onChange,
  label = "Deportes",
}: {
  value: Sport[];
  onChange: (next: Sport[]) => void;
  label?: string;
}) {
  const toggle = (s: Sport) => {
    const on = value.includes(s);
    if (on && value.length === 1) return; // no se puede dejar vacío
    onChange(ALL_SPORTS.filter((x) => (x === s ? !on : value.includes(x))));
  };
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {ALL_SPORTS.map((s) => {
        const on = value.includes(s);
        const Icon = ICON[s];
        return (
          <button
            key={s}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(s)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[0.9375rem] font-medium transition-colors ${
              on ? "bg-ink text-canvas" : "bg-surface-2 text-ink"
            }`}
          >
            <Icon size={16} strokeWidth={1.75} aria-hidden />
            {sportLabel(s)}
          </button>
        );
      })}
    </div>
  );
}
