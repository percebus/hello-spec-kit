import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { focusWithKeyboard } from "../../tests/helpers/keyboard";

const { Given, When, Then } = createBdd();
const externalRequests = new WeakMap<Page, string[]>();

function getSelectedEpisode(page: Page) {
  return page
    .getByRole("list", { name: "All episodes", exact: true })
    .getByRole("article")
    .nth(1);
}

Given("a visitor opens the episodes page", async ({ page, baseURL }) => {
  const siteOrigin = new URL(baseURL ?? "http://localhost").origin;
  const requests: string[] = [];

  externalRequests.set(page, requests);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.protocol !== "blob:" &&
      url.protocol !== "data:" &&
      url.origin !== siteOrigin
    ) {
      requests.push(request.url());
    }
  });

  await page.goto("episodes/");
});

Then("no external content is requested", async ({ page }) => {
  expect(externalRequests.get(page)).toEqual([]);
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
    .toBeGreaterThanOrEqual(1);
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
    .toBeGreaterThanOrEqual(1);
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
    .toBeGreaterThanOrEqual(1);
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

Then(
  "the first episode is no longer identified as playing",
  async ({ page }) => {
    const first = page
      .getByRole("list", { name: "All episodes", exact: true })
      .getByRole("article")
      .first();

    await expect(first.locator(".episode-player-status")).toBeEmpty();
    await expect(first.locator("audio")).toHaveAttribute(
      "data-playing",
      "false",
    );
  },
);

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
    const artworkSources = new Set<string>();

    for (const card of await cards.all()) {
      await expect(card.getByRole("heading", { level: 2 })).toHaveText(/\S/);

      const artwork = card.locator("img");
      const episodeId = await card.getAttribute("data-episode-id");
      await expect(artwork).toBeVisible();
      await expect(artwork).toHaveAttribute("alt", "");
      await expect(card.locator("img")).toHaveCount(1);
      await expect(artwork).toHaveCSS("height", "300px");
      expect(episodeId).toBeTruthy();
      const artworkSource = await artwork.getAttribute("src");
      expect(artworkSource).toContain(`/episodes/${episodeId}.svg`);
      artworkSources.add(artworkSource!);
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

    expect(artworkSources.size).toBe(await cards.count());
  },
);

Then("each episode artwork has empty alternative text", async ({ page }) => {
  const cards = page
    .getByRole("list", { name: "All episodes", exact: true })
    .getByRole("article");

  for (const card of await cards.all()) {
    const artwork = card.locator("img");
    await expect(artwork).toHaveAttribute("alt", "");
    await expect(card.locator("img")).toHaveCount(1);
  }
});

Then(
  "episode artwork contains no embedded episode numbers",
  async ({ page }) => {
    const artwork = page
      .getByRole("list", { name: "All episodes", exact: true })
      .getByRole("article")
      .locator("img");
    const artworkSources = await artwork.evaluateAll((images) =>
      images.map((image) => image.getAttribute("src")),
    );

    expect(artworkSources).toHaveLength(20);

    for (const artworkSource of artworkSources) {
      expect(artworkSource).not.toBeNull();

      const response = await page
        .context()
        .request.get(new URL(artworkSource!, page.url()).toString());
      expect(response.ok()).toBe(true);
      expect(await response.text()).not.toMatch(
        /<text\b[^>]*>\s*\d+\s*<\/text>/,
      );
    }
  },
);
