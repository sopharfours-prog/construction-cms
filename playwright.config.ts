import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running, seeded instance.
 *
 *   npm run build && npm run start        # or point E2E_BASE_URL at a server
 *   npm run test:e2e
 *
 * Credentials come from the environment (see e2e/README.md); the seeded demo
 * users are used by default.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share one database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-US",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /public\.spec\.ts|forms\.spec\.ts/,
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: `${baseURL}/lo`,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
