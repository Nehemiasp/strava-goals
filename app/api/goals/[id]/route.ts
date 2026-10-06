import { validateGoalPatch } from "@/lib/goal-validation";
import { fail, json, requireAthlete, sameOrigin } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export async function PATCH(req: Request, ctx: RouteContext<"/api/goals/[id]">) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const athleteId = await requireAthlete();
  if (typeof athleteId !== "number") return athleteId;
  const { id } = await ctx.params;
  const parsed = validateGoalPatch(await req.json().catch(() => null));
  if (!parsed.ok) return fail(400, parsed.error);
  const goal = await (await getStore()).updateGoal(athleteId, id, parsed.value);
  return goal ? json({ goal }) : fail(404, "Goal no encontrado");
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/goals/[id]">) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const athleteId = await requireAthlete();
  if (typeof athleteId !== "number") return athleteId;
  const { id } = await ctx.params;
  return (await (await getStore()).deleteGoal(athleteId, id)) ? json({ ok: true }) : fail(404, "Goal no encontrado");
}
