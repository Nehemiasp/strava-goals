"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconActivity, IconCoach, IconGoals, IconHome } from "./icons";

const TABS = [
  { href: "/", label: "Hoy", Icon: IconHome },
  { href: "/activity", label: "Actividad", Icon: IconActivity },
  { href: "/goals", label: "Goals", Icon: IconGoals },
  { href: "/coach", label: "Coach", Icon: IconCoach },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const active = TABS.findIndex((t) => (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)));
  return (
    <nav
      aria-label="Principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass pointer-events-auto relative grid w-full max-w-[420px] grid-cols-4 rounded-full p-1">
        {active >= 0 && (
          <span
            aria-hidden
            className="lens absolute top-1 bottom-1 left-1 rounded-full"
            style={{ width: "calc((100% - 8px) / 4)", transform: `translateX(${active * 100}%)` }}
          />
        )}
        {TABS.map(({ href, label, Icon }, i) => (
          <Link
            key={href}
            href={href}
            aria-current={i === active ? "page" : undefined}
            className={`relative z-10 flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-full transition-colors ${
              i === active ? "text-ink" : "text-ink-2"
            }`}
          >
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            <span className="label">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
