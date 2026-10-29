import { expect, test } from "@playwright/test";

const primaryPages = [
  { name: "landing", path: "./" },
  { name: "episodes", path: "./episodes/" },
  { name: "about", path: "./about/" },
  { name: "FAQ", path: "./faq/" },
] as const;

// SC-007: The landing page, episodes page, about page, and FAQ page load without visible broken content or browser errors during acceptance testing.
// SRC: https://github.com/percebus/hello-spec-kit/issues/59
for (const { name, path } of primaryPages) {
  test.describe(`SC-007: ${name} page`, () => {
    test("loads without browser errors or failed requests", async ({
      page,
    }) => {
      const problems: string[] = [];
      const isTracked = (url: string) => {
        const { protocol, pathname } = new URL(url);
        return /^https?:$/.test(protocol) && pathname !== "/favicon.ico";
      };
      page.on("console", (message) => {
        // Failed resource loads are reported by the network listeners below.
        if (
          message.type() === "error" &&
          !message.text().startsWith("Failed to load resource")
        ) {
          problems.push(message.text());
        }
      });
      page.on("pageerror", (error) => problems.push(error.message));
      page.on("requestfailed", (request) => {
        const errorText = request.failure()?.errorText ?? "unknown error";
        if (isTracked(request.url()) && !errorText.includes("ERR_ABORTED")) {
          problems.push(`${request.url()} (${errorText})`);
        }
      });
      page.on("response", (response) => {
        if (isTracked(response.url()) && response.status() >= 400) {
          problems.push(`${response.status()} ${response.url()}`);
        }
      });

      await page.goto(path);
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(problems).toEqual([]);
    });

    test("images actually load and have bytes", async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const broken = await page.$$eval("img", (images) =>
        images
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src),
      );
      expect(broken).toEqual([]);

      const sources = await page.$$eval("img", (images) =>
        images.map((image) => image.currentSrc),
      );
      for (const src of sources) {
        const response = await page.request.get(src);
        expect(response.ok(), src).toBe(true);
        expect((await response.body()).length, src).toBeGreaterThan(0);
      }
    });

    test("internal links resolve", async ({ page }) => {
      await page.goto(path);
      const origin = new URL(page.url()).origin;
      const hrefs = await page.$$eval("a[href]", (anchors) =>
        anchors.map((anchor) => (anchor as HTMLAnchorElement).href),
      );
      const internal = [
        ...new Set(
          hrefs
            .filter((href) => href.startsWith(origin))
            .map((href) => href.split("#")[0]),
        ),
      ];
      for (const href of internal) {
        const response = await page.request.get(href);
        expect(response.status(), href).toBeLessThan(400);
      }
    });
  });
}
