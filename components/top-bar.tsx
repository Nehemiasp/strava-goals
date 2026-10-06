"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Transparente en reposo; se vuelve vidrio al hacer scroll. */
export function TopBar({ title, left, right }: { title?: string; left?: ReactNode; right?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      data-scrolled={scrolled}
      className={`sticky top-0 z-30 -mx-5 px-5 transition-[background-color,box-shadow] duration-200 ${scrolled ? "glass" : ""}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex min-h-14 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          {left}
          {title && <h1 className="title-l truncate">{title}</h1>}
        </div>
        <div className="flex shrink-0 items-center gap-1">{right}</div>
      </div>
    </header>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  spinning,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-surface-2 ${spinning ? "[&>svg]:animate-spin" : ""}`}
    >
      {children}
    </button>
  );
}
