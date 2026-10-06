"use client";

import { useId, useRef, useState } from "react";

export interface TrendPoint {
  label: string;
  value: number;
  /** Serie de referencia (p. ej. ritmo necesario). */
  ref?: number;
}

/** Línea suave sin rejilla; al arrastrar el dedo aparece un tooltip de vidrio. */
export function TrendChart({
  points,
  format,
  color = "var(--fern)",
  height = 148,
  ariaLabel,
}: {
  points: TrendPoint[];
  format: (v: number) => string;
  color?: string;
  height?: number;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const W = 320;
  const padX = 4;
  const padTop = 12;
  const padBottom = 22;
  const H = height;
  const n = points.length;
  const max = Math.max(1e-9, ...points.map((p) => Math.max(p.value, p.ref ?? 0)));
  const x = (i: number) => padX + (n === 1 ? (W - padX * 2) / 2 : (i / (n - 1)) * (W - padX * 2));
  const y = (v: number) => padTop + (1 - v / max) * (H - padTop - padBottom);
  const line = (get: (p: TrendPoint) => number | undefined) =>
    points
      .map((p, i) => ({ v: get(p), i }))
      .filter((d): d is { v: number; i: number } => d.v !== undefined)
      .map((d, k) => `${k === 0 ? "M" : "L"}${x(d.i).toFixed(1)} ${y(d.v).toFixed(1)}`)
      .join("");

  const onMove = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const rel = (clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  };

  const mid = Math.floor((n - 1) / 2);
  const hp = hover !== null ? points[hover] : null;

  return (
    <div
      ref={box}
      className="relative touch-pan-y select-none"
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerDown={(e) => onMove(e.clientX)}
      onPointerLeave={() => setHover(null)}
      onPointerUp={(e) => e.pointerType !== "mouse" && setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={ariaLabel} preserveAspectRatio="none" style={{ height: H }}>
        <title>{ariaLabel}</title>
        <text x={padX} y={9} fontSize="10" fill="var(--ink-3)" style={{ fontFamily: "var(--font-sans)" }}>
          {format(max)}
        </text>
        {points.some((p) => p.ref !== undefined) && (
          <path d={line((p) => p.ref)} fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
        <path d={line((p) => p.value)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {[0, mid, n - 1].filter((v, i, a) => n > 0 && a.indexOf(v) === i).map((i) => (
          <text
            key={`${id}-${i}`}
            x={x(i)}
            y={H - 4}
            fontSize="10"
            fill="var(--ink-3)"
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {points[i].label}
          </text>
        ))}
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={padTop - 4} y2={H - padBottom} stroke="var(--ink-3)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <circle cx={x(hover)} cy={y(points[hover].value)} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      {hp && hover !== null && (
        <div
          className="glass pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-field px-3 py-1.5 text-center"
          style={{ left: `clamp(48px, ${(x(hover) / W) * 100}%, calc(100% - 48px))` }}
        >
          <div className="title-m tnum leading-tight">{format(hp.value)}</div>
          <div className="label text-ink-2">{hp.label}</div>
        </div>
      )}
    </div>
  );
}
