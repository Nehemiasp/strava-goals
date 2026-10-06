import { formatCode } from "@/lib/link-code";
import { fail, json, requireAthlete, sameOrigin } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  const store = await getStore();
  if (await store.getLink(id)) return fail(409, "Ya tienes un vínculo. Desvincúlate primero para invitar a otra persona.");
  const { code, expiresAt } = await store.createInvite(id);
  return json({ code: formatCode(code), expiresAt });
}
