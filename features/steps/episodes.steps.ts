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

Given("the first episode is playing", async ({ page }) => {
  const firstPlayer = page.locator("audio").nth(0);
  await expect
    .poll(() =>
      firstPlayer.evaluate((audio: HTMLAudioElement) => audio.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await firstPlayer.evaluate((audio: HTMLAudioElement) => audio.play());
  await expect
    .poll(() => firstPlayer.evaluate((audio: HTMLAudioElement) => audio.paused))
    .toBe(false);
});

When("the visitor starts the second episode", async ({ page }) => {
  const secondPlayer = page.locator("audio").nth(1);
  await expect
    .poll(() =>
      secondPlayer.evaluate((audio: HTMLAudioElement) => audio.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  await secondPlayer.evaluate((audio: HTMLAudioElement) => audio.play());
  await expect
    .poll(() => secondPlayer.evaluate((audio: HTMLAudioElement) => audio.paused))
    .toBe(false);
});

Then("the first episode is paused", async ({ page }) => {
  await expect
    .poll(() =>
      page
        .locator("audio")
        .nth(0)
        .evaluate((audio: HTMLAudioElement) => audio.paused),
    )
    .toBe(true);
});

Then("only the newly selected episode is playing", async ({ page }) => {
  const players = page.locator("audio");
  await expect
    .poll(() =>
      players.evaluateAll(
        (audios: HTMLAudioElement[]) =>
          audios.filter((audio) => !audio.paused).length,
      ),
    )
    .toBe(1);
  await expect
    .poll(() =>
      players.nth(1).evaluate((audio: HTMLAudioElement) => audio.paused),
    )
    .toBe(false);
});
