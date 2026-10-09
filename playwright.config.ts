import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

dotenv.config({
  path: `.env.${process.env.ENV ?? "development"}`,
  override: true,
});

const baseURL = process.env.BASE_URL;
const galleryURL = "http://127.0.0.1:5173/playwright/gallery/index.html";
const bddTestDir = defineBddConfig({
  features: "features/*.feature",
  steps: "features/steps/*.ts",
});
const componentsBddTestDir = defineBddConfig({
  outputDir: ".features-gen-components",
  features: "features/components/*.feature",
  steps: "features/components/steps/*.ts",
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
    {
      // Component tests: Playwright's built-in `mount` against playwright/gallery.
      name: "components-bdd",
      testDir: componentsBddTestDir,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: galleryURL,
        serviceWorkers: "block",
      },
    },
  ],
  webServer: [
    ...(process.env.WEB_SERVER
      ? [
          {
            command: `node scripts/serve-static-export.mjs`,
            url: baseURL,
            reuseExistingServer: !process.env.CI,
          },
        ]
      : []),
    {
      command: "npx vite --config playwright/vite.config.mts",
      url: galleryURL,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
