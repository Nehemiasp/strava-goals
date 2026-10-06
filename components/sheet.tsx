"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSheetHistory } from "@/lib/client/use-sheet-history";
import { IconClose } from "./icons";

/**
 * Sheet inferior. Cabecera de vidrio con grabber; cuerpo sólido.
 * Se cierra con: botón, toque en el fondo, Escape, arrastre hacia abajo en la cabecera,
 * y el botón/gesto "atrás" del sistema.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useSheetHistory(open, onClose);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" style={{ animation: "fade 180ms linear both" }}>
      <button aria-label="Cerrar" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-sheet bg-canvas outline-none"
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: drag ? "none" : "transform 220ms cubic-bezier(0.2,0.8,0.2,1)",
          animation: "sheet-up 320ms cubic-bezier(0.2,0.8,0.2,1) both",
        }}
      >
        <div
          className="glass relative z-10 shrink-0 touch-none px-5 pt-2.5 pb-3"
          onPointerDown={(e) => {
            start.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current));
          }}
          onPointerUp={() => {
            if (drag > 110) onClose();
            setDrag(0);
            start.current = null;
          }}
          onPointerCancel={() => {
            setDrag(0);
            start.current = null;
          }}
        >
          <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-ink-3/40" aria-hidden />
          <div className="flex items-center justify-between">
            <h2 className="title-m">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-surface-2"
            >
              <IconClose size={22} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-6">{children}</div>
        {footer && (
          <div className="shrink-0 bg-canvas px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}
