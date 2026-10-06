import { normalizeCode } from "@/lib/link-code";
import { fail, json, requireAthlete, sameOrigin } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = normalizeCode(body?.code);
  // Misma respuesta para "no existe", "caducó" y "ya se usó": no se revela cuál es.
  if (!code) return fail(400, "Código inválido o caducado");
  const result = await (await getStore()).acceptInvite(code, id);
  if (!result.ok) {
    if (result.reason === "own") return fail(400, "Ese código lo generaste tú. Pásaselo a la otra persona.");
    if (result.reason === "linked") return fail(409, "Alguno de los dos ya tiene un vínculo.");
    return fail(400, "Código inválido o caducado");
  }
  return json({ partner: { name: result.partner.name, avatar: result.partner.avatar } });
}
