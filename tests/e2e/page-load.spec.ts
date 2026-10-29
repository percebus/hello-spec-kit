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
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(message.text());
      });
      page.on("pageerror", (error) => problems.push(error.message));
      page.on("requestfailed", (request) => problems.push(request.url()));
      page.on("response", (response) => {
        if (response.status() >= 400) problems.push(response.url());
      });

      await page.goto(path);
      await page.waitForLoadState("networkidle");

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
