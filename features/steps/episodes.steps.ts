import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given("a visitor opens the episodes page", async ({ page }) => {
  await page.goto("episodes/");
});

When("the episodes page loads", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "Episodes", exact: true }),
  ).toBeVisible();
});

Then(
  "exactly {int} distinct episodes are available",
  async ({ page }, count: number) => {
    const cards = page
      .getByRole("list", { name: "All episodes", exact: true })
      .getByRole("article");

    await expect(cards).toHaveCount(count);

    const ids = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-episode-id")),
    );
    expect(ids.every((id) => Boolean(id?.trim()))).toBe(true);
    expect(new Set(ids).size).toBe(count);

    const titles = await cards
      .getByRole("heading", { level: 2 })
      .allTextContents();
    expect(titles.every((title) => Boolean(title.trim()))).toBe(true);
    expect(new Set(titles).size).toBe(count);

    for (const card of await cards.all()) {
      await expect(card).toBeVisible();
    }
  },
);

When("the visitor scans the episode collection", async ({ page }) => {
  const cards = page
    .getByRole("list", { name: "All episodes", exact: true })
    .getByRole("article");
  const count = await cards.count();

  expect(count).toBeGreaterThan(0);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
  }
});

Then(
  "each episode shows its complete details and playback action",
  async ({ page }) => {
    const cards = page
      .getByRole("list", { name: "All episodes", exact: true })
      .getByRole("article");

    for (const card of await cards.all()) {
      await expect(card.getByRole("heading", { level: 2 })).toHaveText(/\S/);

      const artwork = card.getByRole("img");
      await expect(artwork).toBeVisible();
      await expect(artwork).toHaveAttribute("alt", /\S/);
      await expect
        .poll(() =>
          artwork.evaluate((image: HTMLImageElement) => image.naturalWidth),
        )
        .toBeGreaterThan(0);

      const metadata = card.locator(".episode-meta > div");
      await expect(metadata.nth(0).locator("dt")).toHaveText("Published");
      await expect(metadata.nth(0).locator("dd")).toHaveText(/\S/);
      await expect(metadata.nth(1).locator("dt")).toHaveText("Duration");
      await expect(metadata.nth(1).locator("dd")).toHaveText(/\S/);
      await expect(card.locator(".episode-summary")).toHaveText(/\S/);

      const player = card.locator("audio[controls]");
      await expect(player).toBeVisible();
      await expect(player).toHaveAttribute("aria-label", /^Play .+/);
    }
  },
);
