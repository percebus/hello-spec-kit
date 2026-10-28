import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

// Implements the scanner side of
// specs/002-pr-preview-verification/contracts/findings.schema.json.

export type Severity = "blocking" | "advisory";
export type Category =
  | "missing-image"
  | "broken-link"
  | "overflow"
  | "horizontal-scroll"
  | "browser-error"
  | "media-error"
  | "external-link";

export interface Finding {
  id: string;
  source: "scanner";
  severity: Severity;
  category: Category;
  page: string;
  viewport: number;
  description: string;
  selector?: string;
  evidence: { artifact: string; file: string };
}

export interface ScanReport {
  pr: number;
  sha: string;
  baseUrl: string;
  viewports: number[];
  pagesVisited: string[];
  findings: Finding[];
}

export interface ScanOptions {
  baseURL: string;
  viewports?: number[];
  artifact: string;
  screenshotDir: string;
  maxPages?: number;
}

type RawFinding = Omit<Finding, "id" | "source" | "evidence">;

const VIEWPORT_HEIGHTS: Record<number, number> = { 320: 800, 1440: 900 };
const IGNORED_PATHS = new Set(["/favicon.ico"]);
const MAX_DESCRIPTION = 500;

const pageFileName = (pagePath: string, viewport: number) =>
  `${pagePath.replace(/^\/|\/$/g, "").replace(/[^a-z0-9]+/gi, "-") || "home"}-${viewport}.png`;

export async function scanSubsite(
  page: Page,
  { baseURL, viewports = [320, 1440], artifact, screenshotDir, maxPages = 100 }: ScanOptions,
): Promise<Pick<ScanReport, "pagesVisited" | "findings">> {
  const base = new URL(baseURL);
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  const raw: RawFinding[] = [];
  const externalLinks = new Set<string>();
  const current = { page: "/", viewport: viewports[0] };

  const record = (finding: Omit<RawFinding, "page" | "viewport">) =>
    raw.push({ ...finding, page: current.page, viewport: current.viewport });

  const toSubsitePath = (url: URL) =>
    url.origin === base.origin && url.pathname.startsWith(basePath)
      ? `/${url.pathname.slice(basePath.length)}`
      : null;

  // Skips blob:/data: URLs (e.g. synthesized audio previews) and other origins.
  const sameOriginHttp = (raw: string) => {
    const url = new URL(raw);
    return /^https?:$/.test(url.protocol) &&
      url.origin === base.origin &&
      !IGNORED_PATHS.has(url.pathname)
      ? url
      : null;
  };

  page.on("request", (request) => {
    const url = sameOriginHttp(request.url());
    if (url && !url.pathname.startsWith(basePath)) {
      record({
        severity: "blocking",
        category: "broken-link",
        description: `Request leaves the subsite: ${url.pathname}`,
      });
    }
  });
  page.on("response", (response) => {
    const url = sameOriginHttp(response.url());
    if (url && response.status() >= 400) {
      record({
        severity: "blocking",
        category: "broken-link",
        description: `HTTP ${response.status()} for ${url.pathname}`,
      });
    }
  });
  page.on("requestfailed", (request) => {
    const url = sameOriginHttp(request.url());
    const errorText = request.failure()?.errorText ?? "unknown error";
    if (!url || errorText.includes("ERR_ABORTED")) return;
    record({
      severity: "blocking",
      category: "broken-link",
      description: `Request failed (${errorText}) for ${url.pathname}`,
    });
  });
  page.on("pageerror", (error) =>
    record({
      severity: "blocking",
      category: "browser-error",
      description: `Uncaught error: ${error.message}`,
    }),
  );
  page.on("console", (message) => {
    // Failed resource loads are already reported by the network listeners.
    if (message.type() !== "error" || message.text().startsWith("Failed to load resource")) {
      return;
    }
    record({
      severity: "blocking",
      category: "browser-error",
      description: `Console error: ${message.text()}`,
    });
  });

  const pagesVisited: string[] = [];
  const queue = ["/"];
  const seen = new Set(queue);

  for (const [index, viewport] of viewports.entries()) {
    await page.setViewportSize({ width: viewport, height: VIEWPORT_HEIGHTS[viewport] ?? 900 });
    const pages = index === 0 ? queue : pagesVisited;

    for (let i = 0; i < pages.length && i < maxPages; i++) {
      const pagePath = pages[i];
      current.page = pagePath;
      current.viewport = viewport;
      if (index === 0) pagesVisited.push(pagePath);

      await page.goto(new URL(pagePath.slice(1), base).href, { waitUntil: "load" });
      await settle(page);

      if (index === 0) {
        for (const href of await collectLinks(page)) {
          const url = new URL(href);
          url.hash = "";
          url.search = "";
          const subsitePath = toSubsitePath(url);
          if (subsitePath !== null) {
            if (!seen.has(subsitePath)) {
              seen.add(subsitePath);
              queue.push(subsitePath);
            }
          } else if (url.origin === base.origin) {
            record({
              severity: "blocking",
              category: "broken-link",
              description: `Link leaves the subsite: ${url.pathname}`,
            });
          } else if (/^https?:$/.test(url.protocol)) {
            externalLinks.add(url.href);
          }
        }
      }

      for (const finding of await inspectPage(page)) record(finding);
    }
  }

  current.page = "/";
  current.viewport = viewports[0];
  for (const href of externalLinks) {
    const ok = await page.request
      .get(href, { timeout: 10_000, failOnStatusCode: false })
      .then((response) => response.status() < 400)
      .catch(() => false);
    if (!ok) {
      record({
        severity: "advisory",
        category: "external-link",
        description: `External link did not load: ${href}`,
      });
    }
  }

  const findings = dedupe(raw).map((finding, index) => ({
    id: `scan-${String(index + 1).padStart(4, "0")}`,
    source: "scanner" as const,
    ...finding,
    description: finding.description.slice(0, MAX_DESCRIPTION),
    evidence: { artifact, file: `screenshots/${pageFileName(finding.page, finding.viewport)}` },
  }));

  await captureEvidence(page, base, screenshotDir, findings);
  return { pagesVisited, findings };
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

function collectLinks(page: Page) {
  return page.$$eval("a[href]", (anchors) =>
    anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
  );
}

function inspectPage(page: Page): Promise<Omit<RawFinding, "page" | "viewport">[]> {
  return page.evaluate(() => {
    const results: Omit<RawFinding, "page" | "viewport">[] = [];
    const describe = (element: Element) => {
      const parts: string[] = [];
      let node: Element | null = element;
      while (node && node !== document.body && parts.length < 4) {
        let part = node.tagName.toLowerCase();
        if (node.id) {
          parts.unshift(`${part}#${node.id}`);
          break;
        }
        const classes = [...node.classList].slice(0, 2);
        if (classes.length) part += `.${classes.join(".")}`;
        parts.unshift(part);
        node = node.parentElement;
      }
      return parts.join(" > ");
    };

    for (const image of document.querySelectorAll("img")) {
      if (!image.complete || image.naturalWidth === 0) {
        results.push({
          severity: "blocking",
          category: "missing-image",
          description: `Image did not load: ${image.currentSrc || image.src} (alt: "${image.alt}")`,
          selector: describe(image),
        });
      }
    }

    for (const media of document.querySelectorAll<HTMLMediaElement>("audio, video")) {
      if (media.error) {
        results.push({
          severity: "blocking",
          category: "media-error",
          description: `Media error ${media.error.code} for ${media.currentSrc || media.src}`,
          selector: describe(media),
        });
      }
    }

    const viewportWidth = window.innerWidth;
    if (document.documentElement.scrollWidth > viewportWidth + 1) {
      results.push({
        severity: "blocking",
        category: "horizontal-scroll",
        description: `Page scrolls horizontally: content is ${document.documentElement.scrollWidth}px wide in a ${viewportWidth}px viewport`,
      });
    }

    const isScrollContainer = (element: Element) =>
      /auto|scroll/.test(getComputedStyle(element).overflowX);
    const clips = (element: Element) => {
      const style = getComputedStyle(element);
      return /hidden|clip/.test(style.overflowX) || /hidden|clip/.test(style.overflowY);
    };
    const offenders: { element: Element; reason: string }[] = [];

    for (const element of document.body.querySelectorAll("*")) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.textOverflow === "ellipsis") continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;

      let insideScroller = false;
      let clippedBy: Element | null = null;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (isScrollContainer(parent)) {
          insideScroller = true;
          break;
        }
        if (!clippedBy && parent !== document.body && clips(parent)) {
          const bounds = parent.getBoundingClientRect();
          if (
            rect.left < bounds.left - 1 ||
            rect.right > bounds.right + 1 ||
            rect.top < bounds.top - 1 ||
            rect.bottom > bounds.bottom + 1
          ) {
            clippedBy = parent;
          }
        }
      }
      if (insideScroller) continue;

      if (rect.right > viewportWidth + 1 || rect.left < -1) {
        offenders.push({
          element,
          reason: `extends past the ${viewportWidth}px viewport (left ${Math.round(rect.left)}px, right ${Math.round(rect.right)}px)`,
        });
      } else if (clippedBy) {
        offenders.push({ element, reason: `is clipped by ${describe(clippedBy)}` });
      }
    }

    const offending = new Set(offenders.map(({ element }) => element));
    for (const { element, reason } of offenders) {
      let reportedAncestor = false;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (offending.has(parent)) {
          reportedAncestor = true;
          break;
        }
      }
      if (reportedAncestor) continue;
      results.push({
        severity: "blocking",
        category: "overflow",
        description: `Element ${reason}`,
        selector: describe(element),
      });
    }

    return results;
  }) as Promise<Omit<RawFinding, "page" | "viewport">[]>;
}

function dedupe(findings: RawFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = [
      finding.category,
      finding.page,
      finding.viewport,
      finding.selector ?? finding.description,
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function captureEvidence(page: Page, base: URL, screenshotDir: string, findings: Finding[]) {
  const targets = new Map<string, { page: string; viewport: number }>();
  for (const finding of findings) {
    targets.set(finding.evidence.file, { page: finding.page, viewport: finding.viewport });
  }
  if (targets.size === 0) return;

  mkdirSync(screenshotDir, { recursive: true });
  for (const [file, target] of targets) {
    await page.setViewportSize({
      width: target.viewport,
      height: VIEWPORT_HEIGHTS[target.viewport] ?? 900,
    });
    await page.goto(new URL(target.page.slice(1), base).href, { waitUntil: "load" });
    await settle(page);
    await page.screenshot({
      path: path.join(screenshotDir, path.basename(file)),
      fullPage: true,
    });
  }
}

export function writeFindings(directory: string, report: ScanReport) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "findings.json"), `${JSON.stringify(report, null, 2)}\n`);
}
