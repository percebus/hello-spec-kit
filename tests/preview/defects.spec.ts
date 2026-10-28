import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { scanSubsite, writeFindings } from "../helpers/preview-scan";

const OUTPUT_DIR = path.resolve("test-results", "preview-scan");
const sha = process.env.PREVIEW_SHA ?? "";
const pr = Number(process.env.PREVIEW_PR) || 0;

async function publishedSha(request: APIRequestContext) {
  const response = await request.get(`preview.json?t=${Date.now()}`);
  return response.ok() ? ((await response.json()) as { sha?: string }).sha : undefined;
}

function markSuperseded(observed: string | undefined) {
  writeFileSync(
    path.join(OUTPUT_DIR, "superseded"),
    `Subsite shows ${observed ?? "nothing"}, expected ${sha}\n`,
  );
}

test("subsite has no blocking defects", async ({ page, request, baseURL }) => {
  test.setTimeout(10 * 60_000);
  mkdirSync(OUTPUT_DIR, { recursive: true });

  if (sha) {
    const before = await publishedSha(request);
    if (before !== sha) {
      markSuperseded(before);
      test.skip(true, `Subsite no longer shows ${sha}`);
    }
  }

  const { pagesVisited, findings } = await scanSubsite(page, {
    baseURL: baseURL!,
    artifact: `preview-scan-${sha || "local"}`,
    screenshotDir: path.join(OUTPUT_DIR, "screenshots"),
  });

  if (sha) {
    const after = await publishedSha(request);
    if (after !== sha) {
      markSuperseded(after);
      test.skip(true, `Subsite changed to ${after} during the scan`);
    }
  }

  writeFindings(OUTPUT_DIR, {
    pr,
    sha,
    baseUrl: baseURL!,
    viewports: [320, 1440],
    pagesVisited,
    findings,
  });

  const blocking = findings
    .filter((finding) => finding.severity === "blocking")
    .map(({ id, category, page: pagePath, viewport, description }) =>
      `${id} ${category} ${pagePath} @${viewport}px: ${description}`,
    );
  expect(blocking, `${blocking.length} blocking finding(s)`).toEqual([]);
});
