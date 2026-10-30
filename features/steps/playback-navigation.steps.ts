import { expect, type JSHandle } from "@playwright/test";
import { createBdd, test as base } from "playwright-bdd";
import { featuredEpisode } from "../../app/lib/episodes";
import { focusWithKeyboard } from "../../tests/helpers/keyboard";

type Playback = { audio?: JSHandle<HTMLAudioElement> };

export const test = base.extend<{ playback: Playback }>({
  playback: async ({}, use) => {
    const playback: Playback = {};
    await use(playback);
    await playback.audio?.dispose();
  },
});
const { Given, When, Then } = createBdd(test);

const pages = {
  Landing: { path: "./", link: "Home" },
  Episodes: { path: "episodes/", link: "Episodes" },
  Episode: {
    path: `episodes/${featuredEpisode.slug}/`,
    link: "View episode",
  },
  FAQ: { path: "faq/", link: "FAQ" },
  About: { path: "about/", link: "About" },
};

Given(
  "an episode is playing on the {string} page",
  async ({ page, playback }, source: keyof typeof pages) => {
    await page.goto(pages[source].path);
    const player = page.getByLabel(`Play ${featuredEpisode.title}`, {
      exact: true,
    });
    await expect
      .poll(() =>
        player.evaluate((audio: HTMLAudioElement) => audio.readyState),
      )
      .toBeGreaterThanOrEqual(2);
    await focusWithKeyboard(page, player);
    await page.keyboard.press("Space");
    await expect
      .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.paused))
      .toBe(false);
    await expect
      .poll(() =>
        player.evaluate((audio: HTMLAudioElement) => audio.currentTime),
      )
      .toBeGreaterThan(0);
    playback.audio = await player.evaluateHandle(
      (audio: HTMLAudioElement) => audio,
    );
  },
);

When(
  "the visitor navigates to the {string} page",
  async ({ page, baseURL }, destination: keyof typeof pages) => {
    const target = pages[destination];
    const link =
      destination === "Episode"
        ? page
            .getByRole("article")
            .filter({
              has: page.getByRole("heading", {
                name: featuredEpisode.title,
                exact: true,
              }),
            })
            .getByRole("link", { name: target.link })
        : page
            .getByRole("navigation", { name: "Primary navigation" })
            .getByRole("link", { name: target.link, exact: true });

    await link.click();
    await expect(page).toHaveURL(new URL(target.path, baseURL).href);
  },
);

Then("the original episode is paused", async ({ playback }) => {
  await expect
    .poll(() => playback.audio!.evaluate((audio) => audio.paused))
    .toBe(true);
});

Then("no episode is playing on the destination page", async ({ page }) => {
  await expect
    .poll(() =>
      page
        .locator("audio")
        .evaluateAll((players: HTMLAudioElement[]) =>
          players.every((audio) => audio.paused),
        ),
    )
    .toBe(true);
});
