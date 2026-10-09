import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { featuredEpisode } from "../../../app/lib/episodes";
import { focusWithKeyboard } from "../../../tests/helpers/keyboard";

const { Given, When, Then } = createBdd();

function getPlayer(page: Page) {
  return page.getByLabel(`Play ${featuredEpisode.title}`, { exact: true });
}

async function waitForPlayer(page: Page) {
  await expect
    .poll(() =>
      getPlayer(page).evaluate((audio: HTMLAudioElement) => audio.readyState),
    )
    .toBeGreaterThanOrEqual(2);
}

// Story: app/components/episode-player.story.tsx, rendered by playwright/gallery.
Given("the Episode Player", async ({ mount }) => {
  await mount("components/episode-player/Featured");
});

Given("a screen of `width`:{int}", async ({ page }, width: number) => {
  await page.setViewportSize({ width, height: 900 });
});

When("the page loads", async ({ page }) => {
  await waitForPlayer(page);
});

Then("the player is visible", async ({ page }) => {
  await expect(getPlayer(page)).toBeVisible();
  await expect(getPlayer(page)).toBeInViewport();
});

// Focus is reached with Tab (not autofocus); the helper asserts the visible outline.
Then("the page's visible focus is on the player", async ({ page }) => {
  await focusWithKeyboard(page, getPlayer(page));
});

Given(
  /^the featured episode (is playing|is not playing)$/,
  async ({ page }, initialState: string) => {
    const player = getPlayer(page);
    await waitForPlayer(page);
    await focusWithKeyboard(page, player);
    await expect
      .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.paused))
      .toBe(true);
    if (initialState === "is playing") {
      await page.keyboard.press("Space");
      await expect
        .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.paused))
        .toBe(false);
      await expect
        .poll(() =>
          player.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBeGreaterThan(0);
    }
  },
);

When(/^the user hits <kbd>space<\/kbd>$/, async ({ page }) => {
  await expect(getPlayer(page)).toBeFocused();
  await page.keyboard.press("Space");
});

Then(
  /^it (starts playing|stops playing)$/,
  async ({ page }, action: string) => {
    const player = getPlayer(page);
    await expect
      .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.paused))
      .toBe(action === "stops playing");
    if (action === "starts playing") {
      await expect
        .poll(() =>
          player.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBeGreaterThan(0);
    }
  },
);
