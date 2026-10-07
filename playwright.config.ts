import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

dotenv.config({
  path: `.env.${process.env.ENV ?? "development"}`,
  override: true,
});

const baseURL = process.env.BASE_URL;
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
    baseURL,
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
  webServer: process.env.WEB_SERVER
    ? {
        command: `node scripts/serve-static-export.mjs`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
