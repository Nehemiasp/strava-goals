"use client";

import { useMemo, useState } from "react";
import { IconCopy, IconDownload, IconExternal, IconShare } from "@/components/icons";
import { SegmentedControl } from "@/components/segmented";
import { useScreenGate } from "@/components/screen-states";
import { useToast } from "@/components/toast";
import { TopBar } from "@/components/top-bar";
import { SportsPicker } from "@/components/sports-picker";
import { Button, Chip, ChipGroup, Toggle } from "@/components/ui";
import { useData } from "@/lib/client/data";
import { usePersisted } from "@/lib/client/use-persisted";
import {
  buildBrief,
  CHAT_LINKS,
  DEFAULT_BRIEF_OPTIONS,
  DEFAULT_PROMPT,
  MAX_DEEPLINK_CHARS,
  migrateBriefOptions,
  type BriefFormat,
  type BriefOptions,
} from "@/lib/export-brief";

const nf = new Intl.NumberFormat("es");

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Respaldo para contextos sin Clipboard API (HTTP, WebView antiguos).
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="label text-ink-2">{label}</p>
      {children}
    </div>
  );
}

export default function CoachPage() {
  const gate = useScreenGate();
  const { activities, goals, settings, today } = useData();
  const toast = useToast();
  const [opts, setOpts] = usePersisted<BriefOptions>("sg:brief", DEFAULT_BRIEF_OPTIONS, migrateBriefOptions);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const set = <K extends keyof BriefOptions>(k: K, v: BriefOptions[K]) => setOpts((p) => ({ ...p, [k]: v }));

  // `today` es "" hasta que llegan los datos; con una fecha inválida `Intl` lanzaría.
  const brief = useMemo(
    () => (today ? buildBrief(activities, goals, opts, settings, today) : null),
    [activities, goals, opts, settings, today],
  );
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (!brief) {
    return (
      <>
        <TopBar title="Coach" />
        <div className="pt-2">{gate}</div>
      </>
    );
  }

  const copy = async () => toast((await copyText(brief.text)) ? "Copiado al portapapeles" : "No se pudo copiar");

  const share = async () => {
    try {
      await navigator.share({ title: "Mis datos de Strava", text: brief.text });
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("No se pudo compartir");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([brief.text], { type: `${brief.mime};charset=utf-8` }));
    const a = document.createElement("a");
    a.href = url;
    a.download = brief.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openChat = async (link: (typeof CHAT_LINKS)[number]) => {
    const fits = brief.text.length <= MAX_DEEPLINK_CHARS && link.id !== "gemini";
    // Siempre copiamos: si el enlace no admite texto precargado, basta con pegar.
    const copied = await copyText(brief.text);
    window.open(link.url(fits ? brief.text : ""), "_blank", "noopener,noreferrer");
    toast(fits ? `Abriendo ${link.label}` : copied ? `Copiado. Pégalo en ${link.label}` : `Abriendo ${link.label}`);
  };

  return (
    <>
      <TopBar title="Coach" />
      <div className="enter space-y-7 pt-2">
        <p className="text-ink-2">
          Prepara un resumen de tus datos y llévalo a la IA que prefieras (ChatGPT, Claude, Gemini u otra). La app no
          envía nada a ningún servicio de IA: tú decides qué copiar y dónde pegarlo.
        </p>

        {gate ?? (
          <>
            <Group label="Periodo">
              <ChipGroup label="Periodo">
                {([30, 90, 365] as const).map((d) => (
                  <Chip key={d} selected={opts.rangeDays === d} onClick={() => set("rangeDays", d)}>
                    {d === 365 ? "Año" : `${d} días`}
                  </Chip>
                ))}
              </ChipGroup>
            </Group>
            <Group label="Deportes">
              <SportsPicker value={opts.sports} onChange={(v) => set("sports", v)} />
            </Group>
            <div className="rounded-card bg-surface px-4 py-2">
              <Toggle checked={opts.includeGoals} onChange={(v) => set("includeGoals", v)} label="Goals activos" />
              <Toggle checked={opts.includeActivities} onChange={(v) => set("includeActivities", v)} label="Lista de actividades" />
              <Toggle checked={opts.includeHr} onChange={(v) => set("includeHr", v)} label="Frecuencia cardíaca" />
              <Toggle
                checked={opts.includeTitles}
                onChange={(v) => set("includeTitles", v)}
                label="Títulos de actividad"
                hint="Pueden contener nombres de lugares o personas."
              />
            </div>
            <Group label="Formato">
              <SegmentedControl<BriefFormat>
                label="Formato"
                value={opts.format}
                onChange={(v) => set("format", v)}
                options={[
                  { value: "markdown", label: "Markdown" },
                  { value: "json", label: "JSON" },
                ]}
              />
            </Group>

            <section aria-label="Vista previa" className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="title-m">Vista previa</h2>
                <button type="button" onClick={() => setEditingPrompt((v) => !v)} className="min-h-11 text-[0.9375rem] font-medium text-fern">
                  {editingPrompt ? "Listo" : "Editar instrucciones"}
                </button>
              </div>
              {editingPrompt && (
                <div className="space-y-2">
                  <textarea
                    value={opts.prompt}
                    onChange={(e) => set("prompt", e.target.value)}
                    rows={6}
                    aria-label="Instrucciones para la IA"
                    className="w-full resize-y rounded-field bg-surface-2 p-4 text-base text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fern"
                  />
                  <Button variant="text" onClick={() => set("prompt", DEFAULT_PROMPT)}>
                    Restablecer
                  </Button>
                </div>
              )}
              <pre
                tabIndex={0}
                aria-label="Contenido que se copiará"
                className="max-h-72 overflow-auto rounded-card bg-surface-2 p-4 text-[0.8125rem] leading-5 whitespace-pre-wrap text-ink-2"
              >
                {brief.text}
              </pre>
              <p className="label tnum text-ink-3">
                ~{nf.format(brief.tokens)} tokens · {brief.activityCount} {brief.activityCount === 1 ? "actividad" : "actividades"}
              </p>
            </section>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Button block onClick={copy}>
                  <IconCopy size={20} strokeWidth={1.75} aria-hidden /> Copiar
                </Button>
                {canShare && (
                  <Button variant="tonal" onClick={share}>
                    <IconShare size={20} strokeWidth={1.75} aria-hidden /> Compartir
                  </Button>
                )}
              </div>
              <Button variant="tonal" block onClick={download}>
                <IconDownload size={20} strokeWidth={1.75} aria-hidden /> Descargar {opts.format === "json" ? ".json" : ".md"}
              </Button>
            </div>

            <Group label="Abrir un chat nuevo">
              <div className="flex flex-wrap gap-2">
                {CHAT_LINKS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => openChat(l)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-[0.9375rem] font-medium active:opacity-80"
                  >
                    {l.label} <IconExternal size={15} strokeWidth={1.75} aria-hidden />
                  </button>
                ))}
              </div>
              <p className="body-s text-ink-3">
                Copiamos el resumen y abrimos el chat. Si el texto es largo, tendrás que pegarlo.
              </p>
            </Group>
          </>
        )}
      </div>
    </>
  );
}
