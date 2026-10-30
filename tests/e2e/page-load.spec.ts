import { expect, test } from "@playwright/test";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Signal & Story";

const primaryPages = [
  {
    name: "landing",
    path: "./",
    title: siteName,
    heading: "Find the human signal inside the technology story.",
    context: "Signal & Story explores how thoughtful people make creative",
  },
  {
    name: "episodes",
    path: "./episodes/",
    title: "Episodes",
    heading: "Episodes",
    context: "Twenty conversations with people making technology more",
  },
  {
    name: "about",
    path: "./about/",
    title: "About",
    heading: "About the show",
    context: "Signal & Story is a podcast about the choices behind creative",
  },
  {
    name: "FAQ",
    path: "./faq/",
    title: "FAQ",
    heading: "Frequently asked questions",
    context: "Find quick details about the show, publishing schedule",
  },
] as const;

// SC-007: The landing page, episodes page, about page, and FAQ page load without visible broken content or browser errors during acceptance testing.
// SRC: https://github.com/percebus/hello-spec-kit/issues/59
for (const { name, path, title, heading, context } of primaryPages) {
  test.describe(`SC-007: ${name} page`, () => {
    // FR-017: Page titles use consistent site branding.
    // FR-018: A visitor arriving directly can identify the page and its context.
    // Source: https://github.com/percebus/hello-spec-kit/issues/48
    test("FR-017 and FR-018: shows a clear page title and context", async ({
      page,
    }) => {
      await page.goto(path);

      const expectedTitle =
        path === "./" ? title : `${title} | ${siteName}`;
      await expect(page).toHaveTitle(expectedTitle);
      await expect(
        page.getByRole("heading", { level: 1, name: heading, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(context)).toBeVisible();
    });

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

      for (const image of await page.locator("img").all()) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (element: HTMLImageElement) =>
                element.complete && element.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }

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
