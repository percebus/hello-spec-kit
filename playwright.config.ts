import dotenv from "dotenv";
import {
  defineConfig,
  devices,
  type PlaywrightTestConfig,
} from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

// The preview scanner targets a published subsite whose base path is set per
// run, so it must not let `.env.*` files override the process environment.
const previewScan = process.env.PREVIEW_SCAN === "1";

if (!previewScan) {
  dotenv.config({
    path: `.env.${process.env.ENV ?? "local"}`,
    override: true,
  });
}

const baseURL = `${process.env.BASE_URL}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
const galleryURL = "http://127.0.0.1:5173/playwright/gallery/index.html";

const reporter: PlaywrightTestConfig["reporter"] = [
  [process.env.CI ? "github" : "list"],
  ["junit", { outputFile: "test-results/junit.xml" }],
];

function previewScanConfig(): PlaywrightTestConfig {
  return {
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    workers: 1,
    reporter,
    use: { baseURL, trace: "off" },
    projects: [
      {
        name: "preview-scan",
        testDir: "./tests/preview",
        use: { ...devices["Desktop Chrome"] },
      },
    ],
    webServer: [],
  };
}

function defaultConfig(): PlaywrightTestConfig {
  const bddTestDir = defineBddConfig({
    features: "features/*.feature",
    steps: "features/steps/*.ts",
  });
  const componentsBddTestDir = defineBddConfig({
    outputDir: ".features-gen-components",
    features: "features/components/*.feature",
    steps: "features/components/steps/*.ts",
  });

  return {
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    workers: 1,
    reporter,
    use: {
      baseURL,
      trace: "on-first-retry",
    },
    projects: [
      {
        name: "unit",
        testDir: "./tests/unit",
      },
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
      ...(process.env.PLAYWRIGHT_WEB_SERVER
        ? [
            {
              command: "npm run start:test",
              url: baseURL,
              reuseExistingServer: !process.env.CI,
            },
          ]
        : []),
      {
        command: "npm run vite:playwright",
        url: galleryURL,
        reuseExistingServer: !process.env.CI,
      },
    ],
  };
}

export default defineConfig(
  previewScan ? previewScanConfig() : defaultConfig(),
);
