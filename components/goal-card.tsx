import Link from "next/link";
import { statusText, timeLeftText } from "@/lib/goal-copy";
import { formatMetric } from "@/lib/format";
import type { Progress } from "@/lib/goals-progress";
import type { Goal, Settings } from "@/lib/types";
import { IconBike, IconRun } from "./icons";
import { PaceTrack, stateColor } from "./pace-track";

const SPORT_TAG = { run: "Correr", ride: "Bici", both: "Correr y bici" } as const;

export function statusColor(state: Progress["state"]): string {
  return state === "expired" || state === "upcoming" ? "var(--ink-2)" : stateColor(state);
}

export function GoalCard({ goal, progress, settings, today }: { goal: Goal; progress: Progress; settings: Settings; today: string }) {
  const { units } = settings;
  const cur = formatMetric(goal.metric, progress.current, units);
  const tgt = formatMetric(goal.metric, goal.target, units);
  const status = statusText(goal, progress, units);
  return (
    <Link
      href={`/goals/${goal.id}`}
      aria-label={`${goal.title}. ${cur.value} de ${tgt.value} ${tgt.unit}. ${status}`}
      className="block rounded-card bg-surface p-5 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="title-m min-w-0">{goal.title}</h3>
        <span className="label mt-1 flex shrink-0 items-center gap-1 text-ink-3">
          {goal.sport !== "ride" && <IconRun size={14} strokeWidth={1.75} aria-hidden />}
          {goal.sport !== "run" && <IconBike size={14} strokeWidth={1.75} aria-hidden />}
          {SPORT_TAG[goal.sport]}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="display-l tnum">{cur.value}</span>
        <span className="text-lg font-medium text-ink-3">
          / {tgt.value} {tgt.unit}
        </span>
      </div>
      <div className="mt-3">
        <PaceTrack progress={progress} showMarker={goal.metric !== "streak"} />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3 text-[0.9375rem]">
        <span className="font-medium" style={{ color: statusColor(progress.state) }}>
          {status}
        </span>
        <span className="body-s shrink-0 text-ink-2">{timeLeftText(goal, progress, today)}</span>
      </div>
    </Link>
  );
}
