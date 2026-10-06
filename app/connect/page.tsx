import { isDemo } from "@/lib/server/env";

const ERRORS: Record<string, string> = {
  denied: "Cancelaste la conexión con Strava. Cuando quieras, inténtalo de nuevo.",
  scope: "Necesitamos el permiso para ver tus actividades. Vuelve a conectar y deja marcada esa casilla.",
  state: "La conexión caducó o no se pudo verificar. Inténtalo de nuevo.",
  strava: "Strava no respondió como esperábamos. Inténtalo de nuevo en un momento.",
  session: "Tu sesión caducó. Vuelve a conectar con Strava.",
};

const POINTS = [
  "Goals por distancia, tiempo, desnivel, frecuencia o racha",
  "Tus últimas 10 salidas de correr y bici, con filtro",
  "Exporta tus datos y consúltalos con la IA que prefieras",
];

export default async function ConnectPage({ searchParams }: PageProps<"/connect">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  const demo = isDemo();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-between px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="enter">
        <p className="label mb-6 text-ink-2">Goals</p>
        <h1 className="display-l">
          Tus metas, medidas con tus datos reales de Strava.
        </h1>
        <ul className="mt-9 space-y-4 text-ink-2">
          {POINTS.map((p) => (
            <li key={p} className="flex gap-3">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fern" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 space-y-4">
        {message && (
          <p role="alert" className="rounded-field bg-surface px-4 py-3 text-danger">
            {message}
          </p>
        )}
        {/* TODO(marca): sustituir por el asset oficial "Connect with Strava" antes de publicar (ver DISEÑO.md §12). */}
        <a
          href="/api/auth/strava"
          className="flex h-[52px] w-full items-center justify-center rounded-field bg-[#FC4C02] px-6 font-semibold text-white active:opacity-90"
        >
          {demo ? "Entrar con datos de ejemplo" : "Connect with Strava"}
        </a>
        <p className="body-s text-center text-ink-2">
          {demo
            ? "Modo demo: no se conecta a Strava; verás actividades y goals de ejemplo."
            : "Solo lectura. Puedes desconectarte y borrar tus datos cuando quieras."}
        </p>
        <p className="label text-center text-ink-3">Powered by Strava</p>
      </div>
    </main>
  );
}
