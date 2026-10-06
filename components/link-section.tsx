"use client";

import Link from "next/link";
import { useState } from "react";
import { copyText } from "@/lib/client/clipboard";
import { useData } from "@/lib/client/data";
import { IconCopy, IconShare } from "./icons";
import { useToast } from "./toast";
import { Button, inputClass } from "./ui";

/** Ajustes → vínculo con otra persona para el reto. Se oculta si el servidor aún no tiene las tablas. */
export function LinkSection({ onNavigate }: { onNavigate: () => void }) {
  const { partner, linkAvailable, createInvite, acceptInvite, unlink } = useData();
  const toast = useToast();
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [entering, setEntering] = useState(false);
  const [codeText, setCodeText] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!linkAvailable) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal");
    } finally {
      setBusy(false);
    }
  };

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (partner) {
    return (
      <div className="space-y-3 rounded-card bg-surface p-4">
        <div>
          <p className="font-medium">Reto con {partner.name}</p>
          <p className="body-s text-ink-2">Comparten solo totales por día y deporte. Nunca títulos, rutas ni frecuencia cardíaca.</p>
        </div>
        {!confirm ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/versus" onClick={onNavigate} className="inline-flex min-h-11 items-center rounded-field bg-surface-2 px-4 font-medium">
              Ver reto
            </Link>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Desvincular
            </Button>
          </div>
        ) : (
          <div className="space-y-3" role="alertdialog" aria-label="Confirmar desvinculación">
            <p>Dejarán de verse los totales el uno del otro. Puedes volver a vincularte con un código nuevo.</p>
            <div className="flex gap-3">
              <Button variant="tonal" onClick={() => setConfirm(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button
                block
                disabled={busy}
                className="!bg-danger !text-white"
                onClick={() =>
                  run(async () => {
                    await unlink();
                    setConfirm(false);
                    toast("Vínculo eliminado");
                  })
                }
              >
                Desvincular
              </Button>
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-card bg-surface p-4">
      <div>
        <p className="font-medium">Reta a tu hermano</p>
        <p className="body-s text-ink-2">
          Comparen sus kilómetros de la semana. Cada uno ve solo los totales por día y deporte del otro: nunca títulos, rutas ni
          frecuencia cardíaca. Pueden desvincularse cuando quieran.
        </p>
      </div>

      {invite ? (
        <div className="space-y-3">
          <p className="label text-ink-2">Tu código (caduca en 24 horas y sirve una sola vez)</p>
          <p aria-label={`Código ${invite.code}`} className="display-l tnum tracking-[0.12em] select-all">
            {invite.code}
          </p>
          <div className="flex gap-3">
            <Button
              variant="tonal"
              onClick={async () => toast((await copyText(invite.code)) ? "Código copiado" : "No se pudo copiar")}
            >
              <IconCopy size={18} strokeWidth={1.75} aria-hidden /> Copiar
            </Button>
            {canShare && (
              <Button
                variant="tonal"
                onClick={() =>
                  navigator
                    .share({ text: `Mi código para el reto en Goals: ${invite.code}` })
                    .catch(() => undefined)
                }
              >
                <IconShare size={18} strokeWidth={1.75} aria-hidden /> Compartir
              </Button>
            )}
          </div>
          <p className="body-s text-ink-3">Pásaselo a tu hermano: debe abrir Ajustes y elegir «Tengo un código».</p>
        </div>
      ) : (
        <Button variant="tonal" block disabled={busy} onClick={() => run(async () => setInvite(await createInvite()))}>
          Generar un código
        </Button>
      )}

      {!entering ? (
        <Button variant="text" onClick={() => setEntering(true)}>
          Tengo un código
        </Button>
      ) : (
        <div className="space-y-3">
          <input
            autoFocus
            value={codeText}
            onChange={(e) => setCodeText(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH"
            aria-label="Código de invitación"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={9}
            className={`${inputClass} tnum tracking-[0.12em]`}
          />
          <Button
            block
            disabled={busy || codeText.replace(/[^A-Za-z0-9]/g, "").length < 8}
            onClick={() =>
              run(async () => {
                const p = await acceptInvite(codeText);
                toast(`Vinculado con ${p.name}`);
              })
            }
          >
            Vincular
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-danger">{error}</p>}
    </div>
  );
}
