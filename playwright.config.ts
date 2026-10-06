import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const port = 3000;
const bddTestDir = defineBddConfig({
  features: "features/*.feature",
  steps: "features/steps/*.ts",
});

export default defineConfig({
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}/hello-spec-kit`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-bdd",
      testDir: bddTestDir,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `node scripts/serve-static-export.mjs`,
    url: `http://127.0.0.1:${port}/hello-spec-kit/`,
    reuseExistingServer: !process.env.CI,
  },
});
