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

async function expectNoClippedText(page: Page) {
  const clippedText = await page.locator("body *").evaluateAll((elements) =>
    elements
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const clipsHorizontally = ["hidden", "clip"].includes(style.overflowX);
        const clipsVertically = ["hidden", "clip"].includes(style.overflowY);

        return (
          element.textContent?.trim() &&
          ((clipsHorizontally &&
            element.scrollWidth > element.clientWidth + 1) ||
            (clipsVertically &&
              element.scrollHeight > element.clientHeight + 1))
        );
      })
      .map((element) => element.textContent?.trim()),
  );

  expect(clippedText).toEqual([]);
}

async function expectNoOverlappingControls(page: Page) {
  const overlaps = await page.evaluate(() => {
    const controls = Array.from(
      document.querySelectorAll(
        "a[href], button, audio[controls], summary, input, select, textarea, [tabindex]:not([tabindex='-1'])",
      ),
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    });

    return controls.flatMap((control, index) => {
      const first = control.getBoundingClientRect();

      return controls.slice(index + 1).flatMap((other) => {
        const second = other.getBoundingClientRect();
        const overlaps =
          Math.min(first.right, second.right) -
            Math.max(first.left, second.left) >
            1 &&
          Math.min(first.bottom, second.bottom) -
            Math.max(first.top, second.top) >
            1;

        return overlaps ? [`${control.tagName} overlaps ${other.tagName}`] : [];
      });
    });
  });

  expect(overlaps).toEqual([]);
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

const enlargedTextPages = [
  {
    name: "landing",
    path: "./",
    heading: "Find the human signal inside the technology story.",
  },
  { name: "episodes", path: "./episodes/", heading: "Episodes" },
  { name: "about", path: "./about/", heading: "About the show" },
  {
    name: "FAQ",
    path: "./faq/",
    heading: "Frequently asked questions",
  },
] as const;

// Source: https://github.com/percebus/hello-spec-kit/issues/62
for (const width of [320, 1280]) {
  test.describe(`SC-011: primary pages support 200% text at ${width}px`, () => {
    for (const { name, path, heading } of enlargedTextPages) {
      test(`${name} page remains readable and operable`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.addStyleTag({
          content: "html { font-size: 200% !important; }",
        });

        await expect(page.locator("body")).toHaveCSS("font-size", "32px");
        await expect(
          page.getByRole("heading", { level: 1, name: heading }),
        ).toBeVisible();
        await expectNoHorizontalScroll(page);
        await expectNoClippedText(page);
        await expectNoOverlappingControls(page);

        const navigation = page.getByRole("navigation", {
          name: "Primary navigation",
        });
        for (const label of ["Home", "Episodes", "About", "FAQ"]) {
          await expect(
            navigation.getByRole("link", { name: label, exact: true }),
          ).toBeVisible();
        }

        if (name === "landing") {
          await expectLandingContentUsable(page);
        } else if (name === "episodes") {
          const firstEpisode = page.locator(".episode-card").first();
          await expect(firstEpisode.locator("audio[controls]")).toBeVisible();
          await firstEpisode
            .getByRole("link", { name: "View episode" })
            .click();
          await expect(page).toHaveURL(/\/episodes\/[^/]+\/$/);
        } else if (name === "about") {
          await navigation.getByRole("link", { name: "FAQ" }).click();
          await expect(page).toHaveURL(/\/faq\/$/);
        } else {
          const firstQuestion = page.locator(".faq-list details").first();
          await firstQuestion.locator("summary").click();
          await expect(firstQuestion.locator("p")).toBeVisible();
        }
      });
    }
  });
}
