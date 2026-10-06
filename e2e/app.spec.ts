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
