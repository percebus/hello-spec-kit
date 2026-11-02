import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { focusWithKeyboard } from "../../tests/helpers/keyboard";

const { Given, When, Then } = createBdd();

function getSelectedEpisode(page: Page) {
  return page
    .getByRole("list", { name: "All episodes", exact: true })
    .getByRole("article")
    .nth(1);
}

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

Given("the visitor selects an episode's playback action", async ({ page }) => {
  const player = getSelectedEpisode(page).locator("audio[controls]");
  await expect(player).toBeVisible();
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.readyState))
    .toBeGreaterThanOrEqual(2);
  await focusWithKeyboard(page, player);
  await page.keyboard.press("Space");
});

When("playback starts", async ({ page }) => {
  const player = getSelectedEpisode(page).locator("audio[controls]");
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.paused))
    .toBe(false);
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.currentTime))
    .toBeGreaterThan(0);
});

Then("the selected episode is clearly identified", async ({ page }) => {
  const episode = getSelectedEpisode(page);
  const title = await episode.getByRole("heading", { level: 2 }).textContent();
  expect(title).toBeTruthy();
  await expect(episode.locator(".episode-player-status")).toContainText(
    `Now playing: ${title}`,
  );
  await expect(episode.locator("audio")).toHaveAttribute(
    "data-playing",
    "true",
  );
});

Then(
  "standard playback controls are available for the selected episode",
  async ({ page }) => {
    const player = getSelectedEpisode(page).locator("audio[controls]");
    await expect(player).toBeVisible();
    expect(
      await player.evaluate((audio: HTMLAudioElement) => audio.controls),
    ).toBe(true);
    await expect(player).toHaveAttribute("aria-label", /^Play .+/);
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
    .poll(() =>
      secondPlayer.evaluate((audio: HTMLAudioElement) => audio.paused),
    )
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

      const artwork = card.locator("img");
      await expect(artwork).toBeVisible();
      await expect(artwork).toHaveAttribute("alt", /\S/);
      await expect(card.getByRole("img")).toHaveCount(1);
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

Then("each episode artwork is decorative", async ({ page }) => {
  const cards = page
    .getByRole("list", { name: "All episodes", exact: true })
    .getByRole("article");

  for (const card of await cards.all()) {
    const artwork = card.locator("img");
    await expect(artwork).toHaveAttribute("alt", /\S/);
    await expect(card.getByRole("img")).toHaveCount(1);
  }
});
