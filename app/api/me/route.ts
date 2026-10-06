import { isDemo } from "@/lib/server/env";
import { json, requireAthlete } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import type { AthleteInfo } from "@/lib/types";

export async function GET() {
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  const row = await (await getStore()).getAthlete(id);
  if (!row) return json({ error: "Sesión caducada" }, 401);
  const me: AthleteInfo = { id: row.id, name: row.name, avatar: row.avatar, demo: isDemo() };
  return json(me);
}
