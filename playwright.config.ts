import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const env = {
  DATABASE_URL: "file:./data/e2e.db",
  AUTH_SECRET: "e2e-secret-0123456789abcdef",
  EMAIL_PROVIDER: "console",
  CRON_SECRET: "e2e-cron",
  APP_URL: `http://localhost:${PORT}`,
  PORT: String(PORT),
};

/**
 * End-to-end tests against a production build with its own database.
 *   npm run test:e2e          (CI installs Chromium with `npx playwright install --with-deps chromium`)
 * Set PW_CHROME_PATH to use an existing Chrome instead of the Playwright download.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROME_PATH ? { executablePath: process.env.PW_CHROME_PATH, args: ["--no-sandbox"] } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npx tsx scripts/e2e-prepare.ts && npm run build && npm run start",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    env,
  },
});
