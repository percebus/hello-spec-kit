import { expect, test, type Page } from "@playwright/test";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Signal & Story";

const primaryPages = [
  { name: "landing", linkName: "Home", path: "/" },
  { name: "episodes", linkName: "Episodes", path: "/episodes/" },
  { name: "about", linkName: "About", path: "/about/" },
  { name: "faq", linkName: "FAQ", path: "/faq/" },
] as const;

const episodes = [
  { number: 20, title: "Designing for Trust", slug: "designing-for-trust" },
  {
    number: 19,
    title: "The Quiet Architecture",
    slug: "the-quiet-architecture",
  },
  { number: 18, title: "Creative Constraints", slug: "creative-constraints" },
  { number: 17, title: "Beyond the Dashboard", slug: "beyond-the-dashboard" },
  {
    number: 16,
    title: "Small Teams, Big Systems",
    slug: "small-teams-big-systems",
  },
  {
    number: 15,
    title: "The Case for Slow Thinking",
    slug: "the-case-for-slow-thinking",
  },
  { number: 14, title: "Making AI Legible", slug: "making-ai-legible" },
  { number: 13, title: "Tools That Teach", slug: "tools-that-teach" },
  {
    number: 12,
    title: "The Maintainer's Mindset",
    slug: "the-maintainers-mindset",
  },
  {
    number: 11,
    title: "Prototypes with Purpose",
    slug: "prototypes-with-purpose",
  },
  {
    number: 10,
    title: "Writing the Interface",
    slug: "writing-the-interface",
  },
  {
    number: 9,
    title: "Systems for Serendipity",
    slug: "systems-for-serendipity",
  },
  {
    number: 8,
    title: "The Craft of Handoffs",
    slug: "the-craft-of-handoffs",
  },
  {
    number: 7,
    title: "Accessibility at the Start",
    slug: "accessibility-at-the-start",
  },
  { number: 6, title: "Questions Before Code", slug: "questions-before-code" },
  { number: 5, title: "The Shape of Feedback", slug: "the-shape-of-feedback" },
  {
    number: 4,
    title: "Products with an Ending",
    slug: "products-with-an-ending",
  },
  { number: 3, title: "Learning in Public", slug: "learning-in-public" },
  { number: 2, title: "The Useful Archive", slug: "the-useful-archive" },
  {
    number: 1,
    title: "Optimism with Evidence",
    slug: "optimism-with-evidence",
  },
] as const;

function expectedPath(path: string) {
  return path;
}

async function openPrimaryPage(
  page: Page,
  primaryPage: (typeof primaryPages)[number],
) {
  await page.addInitScript(() => {
    const clickCountKey = "navigationClickCount";

    if (sessionStorage.getItem(clickCountKey) === null) {
      sessionStorage.setItem(clickCountKey, "0");
    }

    document.addEventListener(
      "click",
      (event) => {
        if (event.isTrusted) {
          const clickCount = Number(sessionStorage.getItem(clickCountKey));
          sessionStorage.setItem(clickCountKey, String(clickCount + 1));
        }
      },
      true,
    );
  });

  await page.goto(`.${primaryPage.path}`);
  await expect(page).toHaveURL(
    new RegExp(`${expectedPath(primaryPage.path)}$`),
  );
  await page.evaluate(() =>
    sessionStorage.setItem("navigationClickCount", "0"),
  );
}

async function expectClickCount(page: Page, expectedMaximum: number) {
  const clickCount = await page.evaluate(() =>
    Number(sessionStorage.getItem("navigationClickCount")),
  );

  expect(clickCount).toBeLessThanOrEqual(expectedMaximum);
}

for (const width of [320, 1440]) {
  test.describe(`SC-012: journeys at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
    });

    test.describe("FR-002: consistent primary navigation", () => {
      for (const source of primaryPages) {
        for (const destination of primaryPages) {
          test(`${source.name} navigates to ${destination.name}`, async ({
            page,
          }) => {
            await openPrimaryPage(page, source);

            const startingUrl = page.url();

            await page
              .getByRole("navigation", { name: "Primary navigation" })
              .getByRole("link", { name: destination.linkName, exact: true })
              .click();

            await expect(page).toHaveURL(
              new RegExp(`${expectedPath(destination.path)}$`),
            );
            await expectClickCount(page, 1);

            if (source === destination) {
              expect(page.url()).toBe(startingUrl);
            }
          });
        }
      }
    });

    test.describe("SC-002: episodes are reachable within two clicks", () => {
      for (const source of primaryPages) {
        for (const episode of episodes) {
          test(`${source.name} reaches episode ${episode.number}: ${episode.title}`, async ({
            page,
          }) => {
            await openPrimaryPage(page, source);

            await page
              .getByRole("navigation", { name: "Primary navigation" })
              .getByRole("link", { name: "Episodes", exact: true })
              .click();
            await expect(page).toHaveURL(
              new RegExp(`${expectedPath("/episodes/")}$`),
            );

            const episodeCard = page.getByRole("article").filter({
              has: page.getByRole("heading", { name: episode.title }),
            });
            await expect(episodeCard).toContainText(
              `Episode ${episode.number}`,
            );
            await episodeCard
              .getByRole("link", { name: "View episode" })
              .click();

            await expect(page).toHaveURL(
              new RegExp(`${expectedPath(`/episodes/${episode.slug}/`)}$`),
            );
            await expect(
              page.getByRole("heading", {
                level: 1,
                name: episode.title,
              }),
            ).toBeVisible();
            await expectClickCount(page, 2);
          });
        }
      }
    });
  });
}

// FR-017: Episode titles use the same site-branding format as other page titles.
// FR-018: Each episode page provides a title and context when opened directly.
// Source: https://github.com/percebus/hello-spec-kit/issues/48
test.describe("FR-017 and FR-018: directly opened episode pages", () => {
  for (const episode of episodes) {
    test(`episode ${episode.number}: ${episode.title} shows its title and context`, async ({
      page,
    }) => {
      await page.goto(`./episodes/${episode.slug}/`);

      await expect(page).toHaveTitle(`${episode.title} | ${siteName}`);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: episode.title,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByText(`Episode ${episode.number}`, { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".episode-summary")).toHaveText(/\S/);
    });
  }
});
