import { defineConfig, devices } from "@playwright/test";

// By default runs against a production build on port 3200 with an in-memory database.
// Set E2E_BASE_URL to point at an already-running server (e.g. `next dev`) for quick iteration.
const external = process.env.E2E_BASE_URL;
const PORT = 3200;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  use: { baseURL: external ?? `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: external
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          DATABASE_URL: "memory://",
          ALLOW_EMBEDDED_DB: "1",
          GEOCODER: "off",
          UPLOAD_DIR: "./data/e2e-uploads",
          BETTER_AUTH_SECRET: "e2e-secret-that-is-at-least-32-characters-long",
          APP_URL: `http://localhost:${PORT}`,
        },
      },
});
