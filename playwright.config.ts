import { defineConfig, devices } from "@playwright/test";

const PORT = 3101;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/connect`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DEMO_MODE: "1",
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789",
      TOKEN_ENC_KEY: Buffer.alloc(32, 9).toString("base64"),
    },
  },
});
