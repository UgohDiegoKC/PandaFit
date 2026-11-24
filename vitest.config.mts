import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // Server modules import "server-only"; in tests we run them directly.
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: "file:./data/test.db", AUTH_SECRET: "test-secret-0123456789", EMAIL_PROVIDER: "console" },
    fileParallelism: false,
  },
});
