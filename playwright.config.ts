import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
import { defineBddConfig } from "playwright-bdd";

const env = process.env.ENV ?? "development";
const envFile = `.env.${env}`;
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const port = 3000;
const baseURL =
  process.env.BASE_URL ?? `http://127.0.0.1:${port}/hello-spec-kit`;
const isLocal = env === "development";
const bddTestDir = defineBddConfig({
  features: "features/*.feature",
  steps: "features/steps/*.ts",
});

export default defineConfig({
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [
    [process.env.CI ? "github" : "list"],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    baseURL: baseURL,
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
  webServer: !isLocal
    ? undefined
    : {
        command: `node scripts/serve-static-export.mjs`,
        url: `http://127.0.0.1:${port}/hello-spec-kit/`,
        reuseExistingServer: !process.env.CI,
      },
});
