import { fail, json, requireAthlete, sameOrigin } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import type { PartnerInfo } from "@/lib/types";

/**
 * Estado del vínculo. Si las tablas todavía no existen (migración 0003 sin ejecutar) responde
 * `available: false` en lugar de un error, para que la interfaz oculte la función y el resto siga funcionando.
 */
export async function GET() {
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  try {
    const link = await (await getStore()).getLink(id);
    const partner: PartnerInfo | null = link ? { name: link.name, avatar: link.avatar } : null;
    return json({ available: true, partner });
  } catch (e) {
    console.error("link: no disponible", e instanceof Error ? e.message : e);
    return json({ available: false, partner: null });
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const id = await requireAthlete();
  if (typeof id !== "number") return id;
  await (await getStore()).deleteLink(id);
  return json({ ok: true });
}
