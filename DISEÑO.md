# Strava Goals · Sistema de diseño

> Versión 0.2 · implementado en el Paso 1–6; ver «Cambios respecto a 0.1» al final.
> Nombre de trabajo: **Goals** (pendiente de decidir, ver §14).

---

## 1. Intención

Una app para ver cómo vas contra tus metas de correr y bicicleta, sin ruido.
La referencia de tono es **MacroFactor**: la información es la protagonista, la interfaz casi desaparece, los números son grandes y las tendencias se leen de un vistazo.

**Liquid Glass se usa como una capa de navegación, no como una estética.** El vidrio vive solo donde algo flota sobre contenido que se desplaza. Las tarjetas, listas y gráficos son superficies sólidas y tranquilas.

**Equilibrio iOS / Android.** Tomamos de iOS la capa translúcida, los sheets con grabber y el ritmo tipográfico. Tomamos de Android la navegación inferior siempre visible con etiquetas, el diseño de borde a borde y el botón atrás del sistema funcionando en todo. Evitamos los gestos y símbolos exclusivos de una plataforma (sin SF Symbols, sin ripples de Material, sin FAB, sin "‹ Atrás" con texto).

### Principios

1. **El dato manda.** Cada pantalla responde una pregunta con un número grande.
2. **Silencio visual.** Separamos con espacio y tono, no con líneas ni sombras.
3. **Un solo acento.** El color significa algo (progreso, deporte, estado) o no se usa.
4. **Vidrio con presupuesto.** Máximo dos capas de vidrio visibles a la vez.
5. **Texto honesto.** Español plano y específico: "Vas 6,2 km por delante", no "¡Increíble progreso! ✨".

---

## 2. Reglas anti "hecho con IA"

Lista de verificación para cada pantalla antes de darla por buena.

| Evitar | En su lugar |
|---|---|
| Degradados en fondos, botones, texto o barras | Colores planos. El único "degradado" permitido es el desenfoque del vidrio |
| Bordes de 1 px alrededor de cada tarjeta | Sin bordes. Separación por espacio (16–24 px) y diferencia tonal canvas → superficie |
| Sombras grandes y difusas en todo | Sombra solo en elementos flotantes de vidrio |
| Brillos, "glow", destellos, ✨ | Nada. Ni en copy ni en gráficos |
| Emojis como iconos | Un único set de iconos de trazo 1,75 px |
| Morado/azul eléctrico por defecto | Acento verde helecho + colores de deporte apagados |
| Tarjeta con icono en círculo de color + título + descripción, repetida | Filas de datos con jerarquía numérica; el icono solo cuando aporta |
| Hero centrado con titular genérico | Pantallas que abren con el dato: km de la semana, goal más cercano |
| Tipografía por defecto (Inter/Arial en todo) | Poppins para cifras y títulos + fuente del sistema para texto (§4) |
| Esquinas muy redondas en todo por igual | Escala de radios con propósito (§6) |
| Copy motivacional vacío | Frases con un número real |

---

## 3. Color

Los tokens son variables CSS. Claro, oscuro y automático (`prefers-color-scheme`) con selector manual en Ajustes. **Todos los pares de texto/fondo de esta tabla se midieron con la fórmula WCAG 2.x y superan AA (≥ 4,5:1).**

### 3.1 Neutros

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--canvas` | `#F4F4F1` | `#0B0C0E` | Fondo de pantalla |
| `--surface` | `#FFFFFF` | `#16181B` | Tarjetas, filas, sheets sólidos |
| `--surface-2` | `#ECECE8` | `#1F2226` | Superficie anidada, campos, track de progreso |
| `--ink` | `#111214` | `#F2F3F5` | Texto principal (18,7:1 / 16,0:1 sobre surface) |
| `--ink-2` | `#55595F` | `#A6AAB1` | Texto secundario (7,1:1 / 7,6:1) |
| `--ink-3` | `#6B6F76` | `#8A8E95` | Texto terciario, unidades (5,1:1 / 5,4:1) |

Los neutros claros tienen un leve tono cálido (no gris azulado puro) para alejarse del look genérico de dashboard.

### 3.2 Acento y semánticos

| Token | Claro | Oscuro | Significado | Contraste (claro / oscuro) |
|---|---|---|---|---|
| `--fern` | `#0B7A5C` | `#3DDBA8` | Acento, progreso, acción principal | 5,3 / 10,1 |
| `--on-fern` | `#FFFFFF` | `#04150F` | Texto sobre relleno de acento | 5,3 / 10,6 |
| `--run` | `#C8421C` | `#FF8460` | Correr | 4,9 / 7,4 |
| `--ride` | `#1F68C9` | `#6FAEFF` | Bicicleta | 5,4 / 7,8 |
| `--walk` | `#9B3F86` | `#E58BD0` | Caminar (caminata y senderismo) | 6,1 / 7,6 (sobre `surface`; ≥ 5,1 sobre `surface-2`) |
| `--amber` | `#9A6200` | `#F2B84B` | Atrasado respecto al ritmo | 5,1 / 9,9 |
| `--danger` | `#C0392B` | `#FF7A6E` | Error, borrar | 5,4 / 7,0 |

Reglas:
- El color de deporte **nunca es la única señal**: siempre va con icono y etiqueta ("Correr" / "Bici").
- El acento no se usa como fondo de superficies grandes. Solo rellenos pequeños: botón principal, barra de progreso, punto de selección.
- Evitamos el naranja `#FC4C02` de Strava como color de marca para no confundir la app con Strava; sí se usa en su botón oficial (§12).

### 3.3 Vidrio

| Token | Claro | Oscuro |
|---|---|---|
| `--glass-tint` | `canvas` al 76 % | `canvas` al 72 % |
| `--glass-edge` | blanco al 55 % (borde interior superior 0,5 px) | blanco al 14 % |
| `--glass-shadow` | `0 8px 32px rgb(0 0 0 / .10)` | `0 8px 32px rgb(0 0 0 / .45)` |

---

## 4. Tipografía

**Dos voces:**

- **Poppins** (600 y 500) para cifras grandes y títulos. Geométrica, amable y legible; da carácter a los números sin recurrir a fuentes tecnológicas.
- **Fuente del sistema** (`-apple-system` → SF Pro en iOS; `Roboto` en Android) para cuerpo, etiquetas y listas. Se siente nativa en cada plataforma y garantiza `tabular-nums` en columnas.

> Nota técnica: Poppins se carga con `next/font` (autoalojada, sin petición a Google en runtime). Las cifras que deben alinearse en columna (tiempos, ritmos en listas) van en la fuente del sistema con `font-variant-numeric: tabular-nums`; Poppins se reserva para cifras aisladas. Se verificará en el Paso 1 si Poppins ofrece cifras tabulares; si no, esta regla ya cubre el caso.

### Escala

| Rol | Fuente | Tamaño / interlínea | Peso | Tracking |
|---|---|---|---|---|
| `display-xl` | Poppins | 56 / 56 | 600 | −0,03 em |
| `display-l` | Poppins | 40 / 44 | 600 | −0,02 em |
| `title-l` | Poppins | 28 / 34 | 600 | −0,01 em |
| `title-m` | Poppins | 20 / 26 | 600 | 0 |
| `body` | Sistema | 16 / 24 | 400 | 0 |
| `body-s` | Sistema | 14 / 20 | 400 | 0 |
| `label` | Sistema | 12 / 16 | 500 | +0,01 em |
| `unit` | Sistema | 0,5 × la cifra que acompaña | 500 | `--ink-3` |

- Mínimo 12 px. Todo en `rem` para respetar el tamaño de texto del sistema.
- Las unidades (km, h, m) van más pequeñas y en `--ink-3`, pegadas a la cifra: **42,3** <sub>km</sub>.
- Sin mayúsculas sostenidas ni subrayados decorativos.

---

## 5. Espaciado y cuadrícula

Base de 4 px. Escala: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`.

- Margen lateral de pantalla: **20 px**.
- Separación entre bloques de una pantalla: **24–32 px**.
- Padding interno de tarjeta: **20 px** (16 en filas compactas).
- Objetivo táctil mínimo: **44 × 44 px**.
- Contenido máximo 560 px de ancho y centrado; en tablets/escritorio la app se muestra como columna, sin intentar ser un dashboard.

---

## 6. Forma y elevación

| Elemento | Radio |
|---|---|
| Tarjeta / superficie | 24 px |
| Elemento anidado, campo | 16 px |
| Botón | 16 px (alto 52) |
| Control segmentado, chip, tab bar | 999 px (cápsula) |
| Sheet (esquinas superiores) | 32 px |

- **Sin bordes** en tarjetas y campos. El estado de foco usa un anillo de 2 px en `--fern` con 2 px de separación.
- **Elevación tonal:** canvas → surface → surface-2. Eso es todo el sistema de profundidad del contenido.
- **Sombra** únicamente en vidrio flotante (`--glass-shadow`).

---

## 7. Liquid Glass: reglas de uso

### Dónde sí
1. **Tab bar** flotante, en cápsula, separada de los bordes 12 px + safe area.
2. **Barra superior** que se vuelve vidrio al hacer scroll (transparente en reposo).
3. **Sheets** (crear goal, detalle de actividad, ajustes): la cabecera y el grabber en vidrio; el cuerpo sólido.
4. **Control segmentado:** el indicador seleccionado es una "lente" de vidrio que se desliza con resorte. Es el elemento firma de la app.
5. **Tooltip del gráfico** mientras se arrastra el dedo.

### Dónde no
Tarjetas, filas, botones principales, campos, gráficos, fondos. Nada de vidrio sobre vidrio.

### Receta CSS

```css
.glass {
  background: color-mix(in oklab, var(--canvas) var(--glass-alpha), transparent);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  box-shadow:
    inset 0 0.5px 0 var(--glass-edge),
    inset 0 0 0 0.5px color-mix(in oklab, var(--glass-edge) 40%, transparent),
    var(--glass-shadow);
}
@supports not (backdrop-filter: blur(1px)) {
  .glass { background: color-mix(in oklab, var(--surface) 94%, transparent); }
}
@media (prefers-reduced-transparency: reduce) {
  .glass { background: var(--surface); backdrop-filter: none; }
}
```

- El texto sobre vidrio siempre es `--ink` (≥ 7:1 sobre el tinte), nunca color de acento pequeño.
- El contenido que pasa por debajo recibe un margen inferior extra para que el último elemento no quede tapado.
- La "refracción" es sutil: desenfoque + saturación + borde especular. Sin brillos animados ni distorsión.

---

## 8. Movimiento

| Tipo | Valor |
|---|---|
| Resorte (lente, sheets) | rigidez 320 · amortiguación 30 |
| Transición de contenido | 220 ms, `cubic-bezier(.2,.8,.2,1)` |
| Conteo de cifras | Solo en la primera carga, ≤ 600 ms |
| Barra de progreso | Crece desde 0 al entrar, 500 ms, una vez |

- Todo respeta `prefers-reduced-motion`: sin resortes ni conteos, solo fundidos de 120 ms.
- El movimiento explica (de dónde viene un sheet, qué filtro cambió), nunca decora.

---

## 9. Iconografía

- Un solo set de línea (base **Lucide**, recortado a ~24 iconos) con trazo **1,75 px**, terminaciones redondeadas, 24 px.
- Iconos de deporte propios y sobrios: corredor y bicicleta, tamaño 20.
- Sin iconos rellenos de colores, sin emojis.

---

## 10. Componentes

| Componente | Descripción |
|---|---|
| **TabBar** | 4 destinos con icono + etiqueta siempre visible. Cápsula de vidrio flotante. Indicador activo = lente de vidrio. |
| **TopBar** | Título `title-l` a la izquierda, acción a la derecha. Vidrio al hacer scroll. |
| **SegmentedControl** | Cápsula `--surface-2`; la lente de vidrio se desliza bajo la opción activa. Usado en el filtro Todo / Correr / Bici. |
| **StatBlock** | Cifra `display-*` + unidad + etiqueta `label` en `--ink-2`. La pieza básica de toda la app. |
| **RouteGlyph** | Silueta SVG del recorrido (de `summary_polyline` de Strava), trazo 2 px en color de deporte, 56 × 56. Hace reconocible cada actividad sin mapas pesados. Se desactiva con el interruptor de privacidad. |
| **ActivityRow** | RouteGlyph · título · fecha relativa · distancia / tiempo / ritmo (o velocidad). Sin borde; separación por espacio. |
| **PaceTrack** | Barra de progreso de goal: relleno `--fern`, **marca de "hoy esperado"** (muesca fina) y valor de adelanto/atraso. Sustituye al anillo de progreso, que está muy visto. |
| **GoalCard** | Título, StatBlock "7,4 / 10 km", PaceTrack, frase de estado ("Vas 1,2 km por delante"). |
| **WeekStrip** | Siete columnas L–D, altura proporcional a km del día, correr y bici apilados en sus colores. |
| **TrendChart** | Línea suave de 8–12 semanas, sin rejilla; 3 marcas de eje; al arrastrar aparece tooltip de vidrio. |
| **Sheet** | Desde abajo, grabber, cabecera de vidrio, cierra con gesto o botón atrás del sistema. |
| **Button** | `primary` (relleno fern), `tonal` (surface-2), `text`. Alto 52, radio 16. Sin degradado ni sombra. |
| **Field / Stepper** | Fondo surface-2, sin borde; el stepper numérico grande para objetivos. |
| **Chip** | Cápsula surface-2; seleccionado = relleno `--ink` con texto `--canvas`. |
| **Toggle** | 51 × 31, pista surface-2 / fern. |
| **EmptyState** | Una frase concreta + una acción. Sin ilustraciones. |
| **Skeleton** | Bloques `--surface-2` con pulso lento de opacidad (sin shimmer con degradado). |
| **Toast** | Cápsula de vidrio sobre la tab bar, 3 s. |

---

## 11. Pantallas

Navegación: **Hoy · Actividad · Goals · Coach**. Ajustes se abre desde el avatar en Hoy.

### 11.1 Conectar (primera vez)

```
┌──────────────────────────────┐
│                              │
│                              │
│  Tus metas,                  │   title-l, alineado a la izquierda
│  medidas con tus             │
│  datos reales de Strava.     │
│                              │
│  · Goals por distancia,      │   body-s, 3 líneas concretas
│    tiempo, desnivel o        │
│    frecuencia                │
│  · Tus últimas salidas       │
│  · Exporta tus datos y       │
│    consúltalos con la IA     │
│    que prefieras             │
│                              │
│ ┌──────────────────────────┐ │
│ │  Connect with Strava     │ │   botón OFICIAL de Strava
│ └──────────────────────────┘ │
│  Solo lectura. Puedes        │   label
│  desconectarte cuando quieras│
│            ── powered by STRAVA
└──────────────────────────────┘
```

### 11.2 Hoy

```
┌──────────────────────────────┐
│ Hoy                    (foto)│  TopBar
│                              │
│ Esta semana                  │  label
│ 38,4 km        3 salidas     │  display-xl + unidad / StatBlock
│ ▁▃▁▇▁▅▁   L M X J V S D      │  WeekStrip (correr + bici)
│                              │
│ Goal más cercano             │
│ ┌──────────────────────────┐ │
│ │ 100 km en octubre        │ │  GoalCard
│ │ 71,2 / 100 km            │ │
│ │ ━━━━━━━━━━━┃━━━─────     │ │  PaceTrack con muesca de hoy
│ │ Vas 6,2 km por delante   │ │
│ └──────────────────────────┘ │
│                              │
│ Últimas salidas       Ver todo│
│ [~] Rodar tarde  10,2 km  …  │  ActivityRow ×3
│ [~] Bici larga   54,0 km  …  │
│ [~] Rodaje       8,1 km   …  │
│                              │
│   ╭────────────────────────╮ │
│   │ Hoy  Act.  Goals Coach │ │  TabBar de vidrio
│   ╰────────────────────────╯ │
└──────────────────────────────┘
```

### 11.3 Actividad

```
┌──────────────────────────────┐
│ Actividad                    │
│                              │
│ ╭──────────────────────────╮ │
│ │ Todo │ ◉Correr │ Bici    │ │  SegmentedControl (lente de vidrio)
│ ╰──────────────────────────╯ │
│                              │
│ Últimas 10 · correr          │  label
│ 5 salidas · 41,6 km          │  resumen del filtro activo
│                              │
│ [~]  Rodaje de domingo       │
│      Hoy · 8,1 km            │  ActivityRow
│      5:12 /km · 42:10 · +86 m│
│ [~]  Series 6×800            │
│      Ayer · 7,0 km  …        │
│  …                           │
└──────────────────────────────┘
```
- Filtro: **Todo / Correr / Bici**, recordado entre sesiones. Siempre muestra las **últimas 10** del tipo elegido.
- Correr muestra ritmo (min/km); bici muestra velocidad (km/h).
- Tocar una fila abre un sheet con detalle: métricas completas, pulso medio si existe y enlace "Ver en Strava".

### 11.4 Goals

```
┌──────────────────────────────┐
│ Goals                  [ + ] │
│ Activos · Historial          │  segmentado
│                              │
│ ┌──────────────────────────┐ │
│ │ 100 km en octubre        │ │
│ │ 71,2 / 100 km  · Correr  │ │
│ │ ━━━━━━━━━━━┃━━━─────     │ │
│ │ Quedan 25 días           │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 3 salidas por semana     │ │
│ │ 2 / 3 esta semana        │ │
│ │ ━━━━━━━━━━━━━━┃─────     │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

**Detalle de goal:** cifra grande, PaceTrack ampliado, TrendChart del periodo con línea "ritmo necesario" punteada, proyección ("A este ritmo cerrarás en 94 km"), lista de actividades que cuentan, acciones Editar / Archivar.

**Crear goal (sheet en 3 pasos):**
1. *Qué*: distancia · tiempo · desnivel · frecuencia · racha (o una plantilla).
2. *Cuánto y dónde*: stepper grande del objetivo + chips Correr / Bici / Ambos.
3. *Cuándo*: Esta semana · Este mes · Este año · Rango personalizado. Resumen en una frase antes de guardar: "Correr 100 km entre el 1 y el 31 de octubre".

**Cálculo de ritmo:** `esperado = objetivo × (tiempo transcurrido / duración)`; `diferencia = real − esperado`. El texto siempre usa la unidad del goal ("6,2 km por delante"), no porcentajes. Colores: por delante o al día → `--fern`; atrasado → `--amber` (no rojo; no es un error).

### 11.5 Coach (exportar para IA)

No hay IA dentro de la app. Esta pantalla prepara un **brief** con tus datos para llevarlo a la IA que prefieras (ChatGPT, Claude, Gemini u otra) cuando quieras.

```
┌──────────────────────────────┐
│ Coach                        │
│ Lleva tus datos a la IA que  │
│ prefieras.                   │
│                              │
│ Periodo   [30 d] [90 d] [Año]│  chips
│ Deporte   [Correr][Bici][Ambos]
│ Incluir   ◉ Goals activos    │  toggles
│           ◉ Actividades      │
│           ○ Títulos          │  apagado por defecto
│ Formato   Markdown · JSON    │  segmentado
│                              │
│ ┌──────────────────────────┐ │
│ │ # Mis datos de Strava    │ │  vista previa en surface-2
│ │ Periodo: 8 sep – 6 oct   │ │
│ │ Eres un entrenador…      │ │
│ │ …                        │ │
│ └──────────────────────────┘ │
│ ~1.900 tokens · 24 actividades│ label
│                              │
│ [ Copiar ]  [ Compartir ]    │  primary + tonal
│ Descargar .md · Abrir en ▸   │  text buttons
└──────────────────────────────┘
```

- **Prompt plantilla editable** al inicio del brief ("Eres un entrenador de running y ciclismo…, analiza mi carga, compara con mis goals y proponme las próximas 4 semanas"). El usuario lo puede cambiar antes de copiar.
- **Privacidad por defecto:** el brief **no incluye** coordenadas, rutas, nombres de lugares ni títulos de actividad. Son opciones que se activan a propósito.
- Estimación de tamaño en tokens para que el usuario sepa si cabe en su chat.
- **Acciones:** copiar, compartir (hoja de compartir del sistema), descargar `.md` / `.json`, y atajos para abrir un chat nuevo en ChatGPT, Claude o Gemini cuando admitan precarga por enlace; si el contenido es demasiado largo para un enlace, se copia al portapapeles y se avisa con un toast.
- Todo se genera en nuestro propio servidor/cliente. **No se llama a ningún proveedor de IA.**

Ejemplo de salida (Markdown):

```md
# Contexto
Soy corredor y ciclista aficionado. Periodo: 8 sep – 6 oct 2026.

# Instrucciones
Eres un entrenador de running y ciclismo. Analiza mi carga de las últimas
semanas, compárala con mis goals y propón las próximas 4 semanas.

# Goals activos
- 100 km corriendo en octubre — 71,2 km (esperado hoy: 65,0 km)
- 3 salidas por semana — 2 de 3 esta semana

# Resumen semanal
| Semana | Correr km | Bici km | Salidas | Desnivel m |
|---|---|---|---|---|
| 29 sep | 31,0 | 54,0 | 4 | 612 |

# Actividades
| Fecha | Deporte | km | Tiempo | Ritmo/Vel. | Desnivel m | FC media |
|---|---|---|---|---|---|---|
| 5 oct | Correr | 8,1 | 42:10 | 5:12 /km | 86 | 151 |
```

### 11.6 Ajustes (sheet desde el avatar)

Unidades (km/mi), inicio de semana (lunes/domingo), tema (auto/claro/oscuro), mostrar siluetas de ruta, exportar mis datos, **desconectar Strava y borrar mis datos**, enlace a Strava y versión.

---

## 12. Marca de Strava (obligatoria)

La API de Strava exige su identidad visual. Se cumple así:
- Botón de inicio: el asset oficial **"Connect with Strava"**, sin modificarlo.
- Atribución **"Powered by Strava"** (logo oficial) en Conectar y en Ajustes.
- Cada actividad con enlace **"Ver en Strava"**.
- La app no usa el nombre ni el logo de Strava como propios.

---

## 13. Accesibilidad y plataformas

- Contraste AA en texto y ≥ 3:1 en componentes no textuales (medido para la paleta de §3).
- Objetivos táctiles ≥ 44 px. Sin acciones que dependan solo de gestos.
- `prefers-reduced-motion` y `prefers-reduced-transparency` respetados (§7, §8).
- Texto escalable con `rem`; las filas se reorganizan en vez de truncar las cifras.
- Lectores de pantalla: cada ActivityRow y GoalCard se lee como una frase ("Rodaje de domingo, 8,1 kilómetros, 42 minutos, ritmo 5:12 por kilómetro").
- **PWA:** `display: standalone`, `viewport-fit=cover`, `env(safe-area-inset-*)` en tab bar y sheets, `theme-color` por esquema, iconos maskable para Android y `apple-touch-icon` para iOS. El botón atrás de Android cierra sheets antes de navegar.
- Idioma `es`; números con coma decimal; fechas relativas ("Hoy", "Ayer", "Lun 5 oct").

---

## 14. Decisiones abiertas (necesito tu opinión)

1. **Nombre de la app.** "Goals" es provisional. Ideas: *Meta*, *Ritmo*, *Cadencia*.
2. **Acento.** Propongo verde helecho (`#0B7A5C` / `#3DDBA8`). Alternativa si lo quieres más cálido: ámbar. ¿Te convence el verde?
3. **Tipografía.** Poppins para cifras/títulos + fuente del sistema para texto. ¿Prefieres Poppins en todo, o Montserrat para las cifras?
4. **Nombre del cuarto tab.** "Coach" (propuesto) frente a "Exportar" o "IA". "Coach" es más corto; la pantalla explica qué hace.
5. **Siluetas de ruta (RouteGlyph).** Es el elemento visual más distintivo de las actividades, pero muestra la forma del recorrido. Propongo activarlo por defecto con interruptor en Ajustes. ¿De acuerdo?
6. **Unidades por defecto.** Métricas (km, m, min/km) con opción a millas.

Cuando apruebes o ajustes estas decisiones, empiezo por el **Paso 1** (andamiaje Next.js + PWA + tokens).

---

## 15. Cambios respecto a 0.1 (decididos al construir)

| Tema | Decisión |
|---|---|
| Tinte del vidrio | Sube de 62/58 % a **76/72 %**. El desenfoque no siempre está disponible (navegadores antiguos, `prefers-reduced-transparency`, renderizado por software), y con poco tinte el texto de debajo se cuela. |
| Goals · pestañas | «Activos» e **«Historial»** (cumplidos, vencidos y archivados), en vez de «Completados». |
| Coach · opciones | No hay «Ubicación y rutas»: el brief **nunca** incluye coordenadas ni polilíneas. Las opciones son goals, actividades, frecuencia cardíaca y **títulos** (apagado por defecto). |
| Ajustes | Unidades, inicio de semana, tema y siluetas se guardan **en el dispositivo** (localStorage). Los goals sí se sincronizan en Supabase. |
| Rachas | «Racha» mide la racha más larga de días seguidos dentro del periodo; no tiene muesca de ritmo ni proyección. |
| «Por delante / por detrás» | En conteos (salidas) una diferencia menor a media salida se lee «Vas al día». |
| Cifras | Distancias de actividad con un decimal fijo (`7,0 km`); objetivos recortados (`100 km`). |
| Botón de Strava | Provisional (naranja de marca + texto). **Pendiente** sustituirlo por el asset oficial antes de publicar. |
| Fuera de alcance por ahora | Modo sin conexión con datos (el service worker solo cachea estáticos y muestra una página offline), notificaciones y webhooks de Strava. |

### 15.1 Caminar como tercer deporte

| Tema | Decisión |
|---|---|
| Deportes | `Correr`, `Bici` y **`Caminar`**, tres deportes aparte. En Strava, `Walk` y `Hike` cuentan como Caminar. |
| Color e icono | Ciruela (`--walk`) con el icono de persona de pie; correr conserva las huellas y bici la bicicleta. Como en los otros dos, el color nunca es la única señal: siempre va con icono y etiqueta. |
| Filtro de Actividad | `Todo · Correr · Bici · Caminar`. Con cuatro opciones **se quitan los iconos** del control segmentado para que quepa a 360 px. |
| Ritmo | Caminar muestra **ritmo (min/km)**, como Strava, igual que correr; la bici muestra velocidad. |
| Deportes de un goal | Ya no es una opción única: es un **conjunto** (selección múltiple, mínimo uno, no se puede dejar vacío). Los goals antiguos «Ambos» pasan a {Correr, Bici} y siguen sin contar caminatas. |
| Coach | El selector de deportes del brief también es múltiple; el resumen semanal añade columna Caminar solo si el deporte está incluido. |
| Hoy | La leyenda semanal y la tira de 7 días incluyen un tercer color. |
