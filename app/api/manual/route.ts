import { todayLocal } from "@/lib/dates";
import { toActivity } from "@/lib/manual";
import { MANUAL_LIMIT, validateManual } from "@/lib/manual-validation";
import { fail, json, requireAthlete, sameOrigin } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  const parsed = validateManual(await req.json().catch(() => null), todayLocal());
  if (!parsed.ok) return fail(400, parsed.error);
  try {
    const store = await getStore();
    if ((await store.countManual(id)) >= MANUAL_LIMIT) {
      return fail(400, `Has llegado al máximo de ${MANUAL_LIMIT} actividades manuales`);
    }
    return json({ activity: toActivity(await store.createManual(id, parsed.value)) }, 201);
  } catch (e) {
    // Normalmente: la migración 0004 aún no se ejecutó en Supabase.
    console.error("manual: crear", e instanceof Error ? e.message : e);
    return fail(503, "No se pudo guardar. Revisa que la base de datos tenga la tabla de actividades manuales.");
  }
}
