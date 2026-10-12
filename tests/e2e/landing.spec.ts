import { expect, test, type Page } from "@playwright/test";

function getFeaturedEpisode(page: Page) {
  return page.getByRole("article").filter({
    has: page.getByText("Featured episode", { exact: true }),
  });
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectLandingContentUsable(page: Page) {
  const featuredEpisode = getFeaturedEpisode(page);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find the human signal inside the technology story.",
    }),
  ).toBeVisible();
  await expect(featuredEpisode).toHaveCount(1);
  await expect(
    featuredEpisode.getByRole("heading", {
      level: 2,
      name: "Designing for Trust",
    }),
  ).toBeVisible();
  await expect(featuredEpisode.locator("audio[controls]")).toBeVisible();

  await page
    .getByRole("link", { name: "Browse all episodes", exact: true })
    .click();
  await expect(page).toHaveURL(/\/episodes\/$/);
}

test.describe("SC-001: identify the show topic and featured episode", () => {
  test("key landing content is identifiable within 10 seconds", async ({
    page,
  }) => {
    test.setTimeout(10_000);

    await page.goto("./");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Find the human signal inside the technology story.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /explores how thoughtful people make creative technology/i,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("article").filter({
        has: page.getByText("Featured episode", { exact: true }),
      }),
    ).toHaveCount(1);
  });
});

test.describe("SC-005: landing page has no horizontal scrolling", () => {
  for (const width of [320, 375, 768, 1440]) {
    test(`landing page fits a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("./");

      await expectNoHorizontalScroll(page);
      await expectLandingContentUsable(page);
    });
  }
});

test.describe("SC-011: landing page supports 200% text enlargement", () => {
  test("landing content remains readable and operable", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("./");
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });

    await expectNoHorizontalScroll(page);
    await expectLandingContentUsable(page);
  });
});
