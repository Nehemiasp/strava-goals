import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
      // `server-only` lanza fuera de Next; en tests se sustituye por un módulo vacío.
      "server-only": `${import.meta.dirname}/tests/stubs/server-only.ts`,
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
