import { decrypt } from "@/lib/server/crypto";
import { isDemo } from "@/lib/server/env";
import { fail, json, sameOrigin } from "@/lib/server/http";
import { destroySession, getSessionAthleteId } from "@/lib/server/session";
import { deauthorize } from "@/lib/server/strava";
import { getStore } from "@/lib/server/store";

/** Cierra sesión. Con `{ deleteData: true }` también revoca el acceso en Strava y borra todos los datos. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Origen no permitido");
  const body = (await req.json().catch(() => ({}))) as { deleteData?: boolean };
  const id = await getSessionAthleteId();

  if (id && body.deleteData) {
    const store = await getStore();
    const row = await store.getAthlete(id);
    if (row && !isDemo() && row.accessTokenEnc) {
      try {
        await deauthorize(decrypt(row.accessTokenEnc));
      } catch {
        /* si el token ya expiró, igualmente borramos nuestros datos */
      }
    }
    await store.deleteAthlete(id);
  }
  await destroySession();
  return json({ ok: true });
}
