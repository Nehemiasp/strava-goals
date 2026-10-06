"use client";

import type { ReactNode } from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/** Cápsula con una "lente" de vidrio que se desliza bajo la opción activa (DISEÑO.md §7). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const n = options.length;
  return (
    <div role="radiogroup" aria-label={label} className="relative flex rounded-full bg-surface-2 p-1">
      <span
        aria-hidden
        className="lens absolute top-1 bottom-1 left-1 rounded-full"
        style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative z-10 flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[0.9375rem] font-medium transition-colors ${
              active ? "text-ink" : "text-ink-2"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
