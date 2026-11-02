import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { featuredEpisode } from "../../../app/lib/episodes";
import { focusWithKeyboard } from "../../../tests/helpers/keyboard";

const { Given, When, Then } = createBdd();

function getPlayer(page: Page) {
  return page.getByLabel(`Play ${featuredEpisode.title}`, { exact: true });
}

async function expectPlaying(page: Page, isPlaying: boolean) {
  await expect
    .poll(() =>
      getPlayer(page).evaluate((audio: HTMLAudioElement) => audio.paused),
    )
    .toBe(!isPlaying);
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

Given("the episode player is ready", async ({ page }) => {
  const player = getPlayer(page);
  await waitForPlayer(page);
  await focusWithKeyboard(page, player);
});

Then("native playback controls are available", async ({ page }) => {
  await expect
    .poll(() =>
      getPlayer(page).evaluate((audio: HTMLAudioElement) => audio.controls),
    )
    .toBe(true);
});

When(
  /^the visitor (?:starts|pauses|resumes) playback$/,
  async ({ page }) => {
    await page.keyboard.press("Space");
  },
);

Then("the episode is playing", async ({ page }) => {
  await expectPlaying(page, true);
});

Then("the episode is paused", async ({ page }) => {
  await expectPlaying(page, false);
});

When(
  "the visitor seeks to {int} seconds",
  async ({ page }, seconds: number) => {
    await getPlayer(page).evaluate(
      (audio: HTMLAudioElement, time) => {
        audio.currentTime = time;
      },
      seconds,
    );
  },
);

Then(
  "playback is at {int} seconds",
  async ({ page }, seconds: number) => {
    await expect
      .poll(() =>
        getPlayer(page).evaluate(
          (audio: HTMLAudioElement) => audio.currentTime,
        ),
      )
      .toBeCloseTo(seconds, 1);
  },
);

When(
  "the visitor sets the volume to {int} percent",
  async ({ page }, percentage: number) => {
    await getPlayer(page).evaluate(
      (audio: HTMLAudioElement, volume) => {
        audio.volume = volume / 100;
      },
      percentage,
    );
  },
);

Then(
  "the volume is {int} percent",
  async ({ page }, percentage: number) => {
    await expect
      .poll(() =>
        getPlayer(page).evaluate((audio: HTMLAudioElement) => audio.volume),
      )
      .toBe(percentage / 100);
  },
);
