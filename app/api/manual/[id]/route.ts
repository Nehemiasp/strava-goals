import { todayLocal } from "@/lib/dates";
import { toActivity } from "@/lib/manual";
import { validateManual } from "@/lib/manual-validation";
import { fail, json, requireAthlete, sameOrigin } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

/** `id` es el de la fila (positivo). La consulta siempre se acota al atleta de la sesión. */
function rowId(raw: string): number | null {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/manual/[id]">) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const athleteId = await requireAthlete();
  if (typeof athleteId !== "number") return athleteId;
  const id = rowId((await ctx.params).id);
  if (id === null) return fail(404, "Actividad no encontrada");
  const parsed = validateManual(await req.json().catch(() => null), todayLocal());
  if (!parsed.ok) return fail(400, parsed.error);
  const updated = await (await getStore()).updateManual(athleteId, id, parsed.value);
  return updated ? json({ activity: toActivity(updated) }) : fail(404, "Actividad no encontrada");
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/manual/[id]">) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const athleteId = await requireAthlete();
  if (typeof athleteId !== "number") return athleteId;
  const id = rowId((await ctx.params).id);
  if (id === null) return fail(404, "Actividad no encontrada");
  return (await (await getStore()).deleteManual(athleteId, id)) ? json({ ok: true }) : fail(404, "Actividad no encontrada");
}
