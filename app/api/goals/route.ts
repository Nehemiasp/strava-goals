import { validateNewGoal } from "@/lib/goal-validation";
import { fail, json, requireAthlete, sameOrigin } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export async function GET() {
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  return json({ goals: await (await getStore()).listGoals(id) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  const parsed = validateNewGoal(await req.json().catch(() => null));
  if (!parsed.ok) return fail(400, parsed.error);
  const store = await getStore();
  if ((await store.listGoals(id)).length >= 50) return fail(400, "Has alcanzado el máximo de 50 goals");
  return json({ goal: await store.createGoal(id, parsed.value) }, 201);
}
