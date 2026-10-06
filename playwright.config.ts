import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3100);

/**
 * End-to-end acceptance tests against a production build with an isolated database,
 * isolated media storage and the deterministic mock AI provider.
 *   npm run build && npm run test:e2e
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 300_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `rm -rf .data/e2e.db* .data/e2e-storage && npm run db:migrate && npm run db:seed && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "pipe",
    env: {
      DATABASE_URL: "file:./.data/e2e.db",
      STORAGE_DIR: "./.data/e2e-storage",
      AI_PROVIDER: "mock",
      APP_URL: `http://localhost:${PORT}`,
    },
  },
});
