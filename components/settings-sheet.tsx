"use client";

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/lib/client/data";
import { LinkSection } from "./link-section";
import { Sheet } from "./sheet";
import { SegmentedControl } from "./segmented";
import { Button, Toggle } from "./ui";

async function logout(deleteData: boolean) {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleteData }),
  });
  // Recarga completa a propósito: descarta todo el estado del cliente al cerrar sesión.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/connect");
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="label text-ink-2">{label}</p>
      {children}
    </div>
  );
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, settings, setSettings } = useData();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (deleteData: boolean) => {
    setBusy(true);
    try {
      await logout(deleteData);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Ajustes">
      <div className="space-y-7">
        {me && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {me.avatar ? <img src={me.avatar} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" /> : (
              <div aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 title-m">{me.name.charAt(0)}</div>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium">{me.name}</div>
              <div className="body-s text-ink-2">{me.demo ? "Modo demo · datos de ejemplo" : "Conectado con Strava"}</div>
            </div>
          </div>
        )}

        <Row label="Unidades">
          <SegmentedControl
            label="Unidades"
            value={settings.units}
            onChange={(units) => setSettings({ units })}
            options={[
              { value: "metric", label: "Kilómetros" },
              { value: "imperial", label: "Millas" },
            ]}
          />
        </Row>
        <Row label="La semana empieza el">
          <SegmentedControl
            label="Inicio de semana"
            value={settings.weekStart}
            onChange={(weekStart) => setSettings({ weekStart })}
            options={[
              { value: "mon", label: "Lunes" },
              { value: "sun", label: "Domingo" },
            ]}
          />
        </Row>
        <Row label="Tema">
          <SegmentedControl
            label="Tema"
            value={settings.theme}
            onChange={(theme) => setSettings({ theme })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "light", label: "Claro" },
              { value: "dark", label: "Oscuro" },
            ]}
          />
        </Row>
        <Toggle
          checked={settings.routeGlyphs}
          onChange={(routeGlyphs) => setSettings({ routeGlyphs })}
          label="Siluetas de ruta"
          hint="Muestra la forma del recorrido en cada actividad."
        />

        <LinkSection onNavigate={onClose} />

        <div className="space-y-1 rounded-card bg-surface p-4">
          <p className="font-medium">Tus datos</p>
          <p className="body-s text-ink-2">
            Puedes llevarte tus actividades y goals a la IA que prefieras desde{" "}
            <Link href="/coach" onClick={onClose} className="text-fern underline underline-offset-2">
              Coach
            </Link>
            .
          </p>
        </div>

        <div className="space-y-1 border-t-0">
          {!confirm ? (
            <>
              <Button variant="tonal" block onClick={() => run(false)} disabled={busy}>
                Cerrar sesión
              </Button>
              <Button variant="danger" block onClick={() => setConfirm(true)}>
                Desconectar Strava y borrar mis datos
              </Button>
            </>
          ) : (
            <div className="space-y-3 rounded-card bg-surface p-4" role="alertdialog" aria-label="Confirmar borrado">
              <p>
                Se revocará el acceso a Strava y se borrarán tus goals y la copia de tus actividades. Esto no se puede
                deshacer. Tus datos en Strava no cambian.
              </p>
              <div className="flex gap-3">
                <Button variant="tonal" onClick={() => setConfirm(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button variant="primary" block onClick={() => run(true)} disabled={busy} className="!bg-danger !text-white">
                  {busy ? "Borrando…" : "Borrar todo"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="label text-center text-ink-3">Datos de actividad: Powered by Strava · Goals v0.1</p>
      </div>
    </Sheet>
  );
}
