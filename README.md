# Goals

App web móvil (PWA) para iOS y Android que se conecta a Strava y permite administrar goals de correr y bicicleta.
El diseño está en [`DISEÑO.md`](./DISEÑO.md).

- **Hoy**: semana actual, goal más cercano, últimas salidas y tendencia de 8 semanas.
- **Actividad**: últimas 10 salidas con filtro Todo / Correr / Bici.
- **Goals**: distancia, tiempo, desnivel, frecuencia o racha, con ritmo esperado y proyección.
- **Coach**: exporta tus datos (Markdown/JSON) para llevarlos a la IA que prefieras. La app no llama a ninguna IA.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres) · Vercel.

## Probar la interfaz sin credenciales

```bash
npm install
cp .env.example .env.local   # y rellena SESSION_SECRET y TOKEN_ENC_KEY (openssl rand -base64 32)
DEMO_MODE=1 npm run dev
```

El modo demo usa actividades y goals de ejemplo en memoria. En producción nunca se activa por omisión.

## Puesta en marcha real

1. **Strava**: crea una app en <https://www.strava.com/settings/api>. En *Authorization Callback Domain* pon el dominio
   (`localhost` para desarrollo). Copia Client ID y Client Secret a `.env.local`.
   Una app de nivel estándar admite **10 atletas conectados**; para más, Strava exige una revisión.
   Límites: 200 lecturas cada 15 min y 2.000 al día (la app sincroniza como máximo cada 10 min por usuario).
   El permiso que pide la app es `read,activity:read_all`; los tokens que muestra el panel de Strava solo tienen `read`
   y no se usan: cada persona obtiene los suyos al iniciar sesión.
2. **Supabase**: crea un proyecto y ejecuta `supabase/migrations/0001_init.sql` en el SQL editor. Copia la URL y la
   *service role key*. Las tablas tienen RLS activado y sin políticas: solo el servidor puede acceder.
3. **Secretos**: `SESSION_SECRET` y `TOKEN_ENC_KEY` con `openssl rand -base64 32`.
4. **Marca de Strava**: sustituye el botón de `app/connect/page.tsx` por el asset oficial "Connect with Strava"
   y mantén la atribución "Powered by Strava" (obligatorio en sus términos).
5. **Vercel**: importa el repo, define las mismas variables de entorno y usa tu dominio como callback en Strava.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build && npm start` | Producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright) con datos demo |
| `npm run lint` | ESLint |

Para E2E con un Chromium ya instalado: `CHROMIUM_PATH=/ruta/a/chrome npm run test:e2e`.

## Privacidad y seguridad

- Los tokens de Strava se guardan cifrados (AES-256-GCM); la sesión es una cookie `httpOnly` firmada.
- El navegador nunca habla con Supabase ni conoce el client secret.
- Las mutaciones comprueban el origen de la petición (defensa CSRF además de `SameSite=Lax`).
- "Desconectar y borrar mis datos" revoca el acceso en Strava y elimina goals y caché.
- El service worker no cachea `/api` ni páginas autenticadas.
