import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/connect");
  await page.getByRole("link", { name: /datos de ejemplo/i }).click();
  await expect(page.getByText("Esta semana", { exact: true })).toBeVisible();
}

test("sin sesión: la app redirige a /connect y la API responde 401", async ({ page, request }) => {
  await page.goto("/goals");
  await expect(page).toHaveURL(/\/connect/);
  expect((await request.get("/api/goals")).status()).toBe(401);
  expect((await request.get("/api/activities")).status()).toBe(401);
});

test("mutaciones desde otro origen se rechazan", async ({ page }) => {
  await login(page);
  const res = await page.request.post("/api/goals", {
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    data: {},
  });
  expect(res.status()).toBe(403);
});

test("Actividad: últimas 10 y filtro por deporte", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Actividad" }).click();
  const rows = page.getByRole("button", { name: /kilómetros/ });
  await expect(rows).toHaveCount(10);

  await page.getByRole("radio", { name: "Correr" }).click();
  await expect(rows).toHaveCount(10);
  for (const label of await rows.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""))) {
    expect(label).toContain("Correr");
  }

  await page.getByRole("radio", { name: "Bici" }).click();
  for (const label of await rows.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""))) {
    expect(label).toContain("Bici");
  }

  // El filtro se recuerda tras recargar.
  await page.reload();
  await expect(page.getByRole("radio", { name: "Bici" })).toHaveAttribute("aria-checked", "true");
});

test("Actividad: el detalle abre un sheet y se cierra con Escape", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Actividad" }).click();
  await page.getByRole("button", { name: /kilómetros/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Ver en Strava/ })).toHaveAttribute("href", /strava\.com\/activities\/\d+/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("Goals: crear desde plantilla, ver detalle y archivar", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Goals" }).click();
  await page.getByRole("button", { name: "Nuevo goal" }).click();
  await page.getByRole("button", { name: "200 km en bici al mes" }).click();
  await expect(page.getByLabel("Título")).toHaveValue("200 km en bici este mes");
  await page.getByRole("button", { name: "Crear goal" }).click();

  const card = page.getByRole("link", { name: /200 km en bici este mes/ });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/goals\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "200 km en bici este mes" })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(1);
  await expect(page.getByText("Actividades que cuentan")).toBeVisible();

  await page.getByRole("button", { name: "Archivar goal" }).click();
  await page.getByRole("link", { name: "Volver a Goals" }).click();
  await expect(page.getByRole("link", { name: /200 km en bici este mes/ })).toBeHidden();
  await page.getByRole("radio", { name: "Historial" }).click();
  await expect(page.getByRole("link", { name: /200 km en bici este mes/ })).toBeVisible();
});

test("Goals: validación impide objetivos inválidos", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Goals" }).click();
  await page.getByRole("button", { name: "Nuevo goal" }).click();
  await page.getByRole("button", { name: /Distancia/ }).click();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  await page.getByPlaceholder("0").fill("0");
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  await page.getByPlaceholder("0").fill("50");
  await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
});

test("Ajustes: cambiar a millas actualiza las unidades", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Ajustes" }).click();
  await page.getByRole("radio", { name: "Millas" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("mi", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("mi", { exact: true }).first()).toBeVisible();
});

test("Coach: el brief no incluye títulos por defecto y los incluye si se pide", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page);
  await page.getByRole("link", { name: "Coach" }).click();
  const preview = page.getByLabel("Contenido que se copiará");
  await expect(preview).toContainText("# Goals activos");
  await expect(preview).not.toContainText("Tempo en el parque");
  await expect(preview).not.toContainText("_p~");

  await page.getByRole("switch", { name: /Títulos de actividad/ }).check();
  await expect(preview).toContainText(/Tempo en el parque|Series 6×800|Rodaje suave|Rodada de tarde/);

  await page.getByRole("radio", { name: "JSON" }).click();
  const json = JSON.parse((await preview.innerText()).trim());
  expect(Array.isArray(json.actividades)).toBe(true);

  await page.getByRole("button", { name: "Copiar" }).click();
  await expect(page.getByRole("status")).toContainText("Copiado");
  expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())).goals.length).toBeGreaterThan(0);
});

test("cerrar sesión y borrar datos devuelve a /connect", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Ajustes" }).click();
  await page.getByRole("button", { name: /borrar mis datos/i }).click();
  await page.getByRole("button", { name: "Borrar todo" }).click();
  await expect(page).toHaveURL(/\/connect/);
  expect((await page.request.get("/api/goals")).status()).toBe(401);
});

test("Actividad: el filtro Caminar muestra solo caminatas", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Actividad" }).click();
  await page.getByRole("radio", { name: "Caminar" }).click();
  const rows = page.getByRole("button", { name: /kilómetros/ });
  const n = await rows.count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(10);
  for (const label of await rows.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""))) {
    expect(label).toContain("Caminar");
  }
  await expect(page.getByText("Últimas 10 · caminar")).toBeVisible();
});

test("Hoy: la leyenda semanal incluye Caminar", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Caminar", { exact: false }).first()).toBeVisible();
});

test("Goals: crear un goal solo de caminar desde la plantilla", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Goals" }).click();
  await page.getByRole("button", { name: "Nuevo goal" }).click();
  await page.getByRole("button", { name: "30 km caminando al mes" }).click();
  await expect(page.getByLabel("Título")).toHaveValue("30 km caminando este mes");
  await page.getByRole("button", { name: "Crear goal" }).click();
  const card = page.getByRole("link", { name: /30 km caminando este mes/ });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/goals\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "30 km caminando este mes" })).toBeVisible();
  await expect(page.getByText("Caminar", { exact: true }).first()).toBeVisible();
});

test("Goals: combinar deportes y no poder dejar la selección vacía", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Goals" }).click();
  await page.getByRole("button", { name: "Nuevo goal" }).click();
  await page.getByRole("button", { name: /Distancia/ }).click();
  await page.getByPlaceholder("0").fill("3000"); // inalcanzable este mes: el goal queda en "Activos"

  const run = page.getByRole("checkbox", { name: "Correr" });
  const ride = page.getByRole("checkbox", { name: "Bici" });
  const walk = page.getByRole("checkbox", { name: "Caminar" });
  await expect(run).toHaveAttribute("aria-checked", "true");
  await expect(walk).toHaveAttribute("aria-checked", "false");

  await walk.click(); // correr + caminar
  await run.click(); // solo caminar
  await expect(run).toHaveAttribute("aria-checked", "false");
  await expect(walk).toHaveAttribute("aria-checked", "true");
  await walk.click(); // intentar dejarlo vacío: se ignora
  await expect(walk).toHaveAttribute("aria-checked", "true");

  await ride.click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByLabel("Título")).toHaveValue("3000 km en bici y caminando este mes");
  await page.getByRole("button", { name: "Crear goal" }).click();
  await expect(page.getByRole("link", { name: /3000 km en bici y caminando este mes/ })).toBeVisible();
});

test("Coach: elegir deportes cambia el contenido y respeta ajustes antiguos", async ({ page }) => {
  await login(page);
  await page.evaluate(() => localStorage.setItem("sg:brief", JSON.stringify({ sport: "run", rangeDays: 30 })));
  await page.getByRole("link", { name: "Coach" }).click();
  const run = page.getByRole("checkbox", { name: "Correr" });
  const ride = page.getByRole("checkbox", { name: "Bici" });
  const walk = page.getByRole("checkbox", { name: "Caminar" });
  // El `sport: "run"` guardado por la versión anterior se convierte en solo Correr.
  await expect(run).toHaveAttribute("aria-checked", "true");
  await expect(ride).toHaveAttribute("aria-checked", "false");
  await expect(walk).toHaveAttribute("aria-checked", "false");
  const preview = page.getByLabel("Contenido que se copiará");
  await expect(preview).not.toContainText("Caminar");

  await walk.click();
  await expect(preview).toContainText("Caminar (km)");
});

test("Goals: editar fechas, deportes y objetivo de un goal", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Goals" }).click();
  await page.getByRole("link", { name: /100 km corriendo este mes/ }).click();
  await expect(page).toHaveURL(/\/goals\/[^/]+$/);
  await page.getByRole("button", { name: "Editar" }).click();

  const dialog = page.getByRole("dialog", { name: "Editar goal" });
  await expect(dialog.getByRole("button", { name: "Sin cambios" })).toBeDisabled();
  // Muestra las fechas actuales y deja cambiarlas.
  await dialog.getByLabel("Desde").fill("2026-10-05");
  await dialog.getByLabel("Hasta").fill("2026-12-15");
  await dialog.getByRole("checkbox", { name: "Caminar" }).click();
  await dialog.getByLabel(/Objetivo en km/).fill("250");
  await dialog.getByRole("button", { name: /Usar el título sugerido/ }).click();
  await expect(dialog.getByLabel("Título")).toHaveValue("250 km corriendo y caminando");

  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "250 km corriendo y caminando" })).toBeVisible();
  await expect(page.getByText(/5 oct – 15 dic/)).toBeVisible();
  await expect(page.getByText("Correr y Caminar").first()).toBeVisible();
});

test("Goals: el editor avisa si las fechas no son válidas", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Goals" }).click();
  await page.getByRole("link", { name: /3 salidas por semana/ }).click();
  await page.getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar goal" });
  await dialog.getByLabel("Desde").fill("2026-12-20");
  await dialog.getByLabel("Hasta").fill("2026-12-01");
  await expect(dialog.getByRole("alert")).toContainText("posterior");
  await expect(dialog.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
});

test("Goals: un atajo de periodo recalcula las fechas", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Goals" }).click();
  await page.getByRole("link", { name: /1\.500 km en bici este año/ }).click();
  await page.getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar goal" });
  await dialog.getByRole("radio", { name: "Este mes" }).click();
  await expect(dialog.getByLabel("Desde")).toBeHidden(); // los atajos ocultan los campos de fecha
  await dialog.getByRole("radio", { name: "Personalizado" }).click();
  await expect(dialog.getByLabel("Desde")).toHaveValue(/-01$/); // primer día del mes
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(dialog).toBeHidden();
});

test("Récords: enlace en Hoy y página con racha, mejor semana y salidas más largas", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: /Récords y resumen/ }).click();
  await expect(page).toHaveURL(/\/records$/);
  await expect(page.getByRole("heading", { level: 1, name: "Récords y resumen" })).toBeVisible();
  await expect(page.getByText("Racha actual")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mejor semana" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Salida más larga" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mejor ritmo corriendo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Esta semana", level: 3 })).toBeVisible();
  // Abre el detalle de una salida desde los récords.
  await page.getByRole("button", { name: /kilómetros/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("Reto: sin vínculo la API responde 403 y los códigos inválidos se rechazan", async ({ page }) => {
  await login(page);
  await page.request.delete("/api/link");
  expect((await page.request.get("/api/versus")).status()).toBe(403);
  const bad = await page.request.post("/api/link/accept", { data: { code: "ZZZZ-9999" } });
  expect(bad.status()).toBe(400);
  expect((await page.request.post("/api/link/accept", { data: { code: "abc" } })).status()).toBe(400);
  // El propio código no se puede aceptar.
  const { code } = await (await page.request.post("/api/link/invite")).json();
  const own = await page.request.post("/api/link/accept", { data: { code } });
  expect(own.status()).toBe(400);
  expect((await own.json()).error).toContain("generaste tú");
});

test("Reto entre hermanos: invitar, aceptar, comparar, privacidad y desvincular", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  try {
    await login(a);
    await b.goto("/api/auth/strava?as=2");
    await expect(b.getByText("Esta semana", { exact: true })).toBeVisible();
    await a.request.delete("/api/link");
    await b.request.delete("/api/link");

    // A genera un código en Ajustes.
    await a.reload();
    await expect(a.getByText("Reta a tu hermano").first()).toBeVisible();
    await a.getByRole("button", { name: "Ajustes" }).click();
    await a.getByRole("button", { name: "Generar un código" }).click();
    const label = await a.locator('p[aria-label^="Código "]').getAttribute("aria-label");
    const code = label!.replace("Código ", "");
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);

    // B lo acepta (en minúsculas y sin guion: se normaliza).
    await b.getByRole("button", { name: "Ajustes" }).click();
    await b.getByRole("button", { name: "Tengo un código" }).click();
    await b.getByLabel("Código de invitación").fill(code.toLowerCase().replace("-", ""));
    await b.getByRole("button", { name: "Vincular" }).click();
    await expect(b.getByText("Reto con Atleta demo")).toBeVisible();

    // El código ya no sirve una segunda vez.
    const reuse = await b.request.post("/api/link/accept", { data: { code } });
    expect(reuse.status()).toBeGreaterThanOrEqual(400);

    // A ve la tarjeta en Hoy y la pantalla del reto.
    await a.keyboard.press("Escape");
    await a.reload();
    const card = a.getByRole("link", { name: /Tú vs\. Hermano/ });
    await expect(card).toBeVisible();
    await card.click();
    await expect(a).toHaveURL(/\/versus$/);
    await expect(a.getByRole("heading", { level: 1, name: "Tú vs. Hermano" })).toBeVisible();
    await expect(a.getByRole("heading", { name: "Últimas 8 semanas" })).toBeVisible();
    await a.getByRole("radio", { name: "Este mes" }).click();
    await a.getByRole("radio", { name: "Tiempo" }).click();
    await expect(a.getByRole("img", { name: /% para ti y/ })).toBeVisible();

    // Privacidad: solo totales por día y deporte.
    const res = await a.request.get("/api/versus");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["days", "partner", "stale", "syncedAt"]);
    expect(Object.keys(body.partner).sort()).toEqual(["avatar", "name"]);
    expect(body.days.length).toBeGreaterThan(10);
    for (const d of body.days) {
      expect(Object.keys(d).sort()).toEqual(["count", "date", "distance", "elevation", "movingTime", "sport"]);
    }
    const raw = JSON.stringify(body);
    for (const secret of ["polyline", "avgHr", "startedAt", "Caminata", "Rodaje", "Series 6", "Rodada"]) expect(raw).not.toContain(secret);

    // Desvincular desde Ajustes corta el acceso de inmediato para ambos.
    await a.getByRole("link", { name: "Volver a Hoy" }).click();
    await a.getByRole("button", { name: "Ajustes" }).click();
    await a.getByRole("button", { name: "Desvincular" }).click();
    await a.getByRole("alertdialog").getByRole("button", { name: "Desvincular" }).click();
    await expect(a.getByText("Vínculo eliminado")).toBeVisible();
    expect((await a.request.get("/api/versus")).status()).toBe(403);
    expect((await b.request.get("/api/versus")).status()).toBe(403);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
