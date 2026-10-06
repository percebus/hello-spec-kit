import { expect, test, type Page } from "@playwright/test";

const basePath = "/hello-spec-kit";

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
  return `${basePath}${path}`;
}

async function openPrimaryPage(
  page: Page,
  primaryPage: (typeof primaryPages)[number],
) {
  await page.goto(expectedPath(primaryPage.path));
  await expect(page).toHaveURL(
    new RegExp(`${expectedPath(primaryPage.path)}$`),
  );
}

test.describe("FR-002: consistent primary navigation", () => {
  for (const source of primaryPages) {
    for (const destination of primaryPages) {
      test(`${source.name} navigates to ${destination.name}`, async ({
        page,
      }) => {
        await openPrimaryPage(page, source);

        const startingUrl = page.url();
        let clickCount = 0;

        await page
          .getByRole("navigation", { name: "Primary navigation" })
          .getByRole("link", { name: destination.linkName, exact: true })
          .click();
        clickCount += 1;

        await expect(page).toHaveURL(
          new RegExp(`${expectedPath(destination.path)}$`),
        );
        expect(clickCount).toBeLessThanOrEqual(1);

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

        let clickCount = 0;

        await page
          .getByRole("navigation", { name: "Primary navigation" })
          .getByRole("link", { name: "Episodes", exact: true })
          .click();
        clickCount += 1;
        await expect(page).toHaveURL(
          new RegExp(`${expectedPath("/episodes/")}$`),
        );

        const episodeCard = page
          .getByRole("article")
          .filter({ has: page.getByRole("heading", { name: episode.title }) });
        await expect(episodeCard).toContainText(`Episode ${episode.number}`);
        await episodeCard.getByRole("link", { name: "View episode" }).click();
        clickCount += 1;

        await expect(page).toHaveURL(
          new RegExp(`${expectedPath(`/episodes/${episode.slug}/`)}$`),
        );
        await expect(
          page.getByRole("heading", { level: 1, name: episode.title }),
        ).toBeVisible();
        expect(clickCount).toBeLessThanOrEqual(2);
      });
    }
  }
});
