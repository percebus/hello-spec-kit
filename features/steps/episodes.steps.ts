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
