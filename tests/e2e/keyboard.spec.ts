import { expect, test } from "@playwright/test";
import { episodes } from "../../app/lib/episodes";
import {
  focusWithKeyboard,
  operatePlayerWithKeyboard,
} from "../helpers/keyboard";

const primaryPages = [
  { name: "Home", path: "/" },
  { name: "Episodes", path: "/episodes/" },
  { name: "About", path: "/about/" },
  { name: "FAQ", path: "/faq/" },
] as const;

// FR-013: All interactive controls MUST be usable by keyboard and provide a visible focus state.
// SRC: https://github.com/percebus/hello-spec-kit/issues/38

// SC-004: Every journey can be completed with keyboard-only input
// SRC: https://github.com/percebus/hello-spec-kit/issues/57
for (const width of [320, 1440]) {
  test.describe(`FR-013 / SC-004: physical keyboard at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
    });

    for (const source of primaryPages) {
      for (const destination of primaryPages) {
        test(`${source.name} to ${destination.name} navigation`, async ({
          page,
        }) => {
          await page.goto(`/hello-spec-kit${source.path}`);
          await focusWithKeyboard(
            page,
            page
              .getByRole("navigation", { name: "Primary navigation" })
              .getByRole("link", { name: destination.name, exact: true }),
          );
          await page.keyboard.press("Enter");
          await expect(page).toHaveURL(
            new RegExp(`/hello-spec-kit${destination.path}$`),
          );
        });
      }
    }

    for (const name of ["Browse all episodes", "Meet the show"]) {
      test(`Home action: ${name}`, async ({ page }) => {
        await page.goto("/hello-spec-kit/");
        await focusWithKeyboard(
          page,
          page.getByRole("link", { name, exact: true }),
        );
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(
          name === "Meet the show" ? /\/about\/$/ : /\/episodes\/$/,
        );
      });
    }

    test("all FAQ answers open and close with Enter and Space", async ({
      page,
    }) => {
      await page.goto("/hello-spec-kit/faq/");
      const questions = page.locator("summary");
      await expect(questions).toHaveCount(4);
      for (const question of await questions.all()) {
        await focusWithKeyboard(page, question);
        const answer = question.locator("..").locator("p");
        await expect(answer).toBeHidden();
        await page.keyboard.press("Enter");
        await expect(answer).toBeVisible();
        await expect(question.locator("..")).toHaveAttribute("open", "");
        await page.keyboard.press("Space");
        await expect(answer).toBeHidden();
        await expect(question.locator("..")).not.toHaveAttribute("open", "");
      }
    });

    test("native audio shortcuts seek and adjust volume", async ({ page }) => {
      await page.goto("/hello-spec-kit/");
      const player = page.locator("audio[controls]");
      await expect
        .poll(() =>
          player.evaluate((audio: HTMLAudioElement) => audio.readyState),
        )
        .toBeGreaterThanOrEqual(2);
      await focusWithKeyboard(page, player);
      await page.keyboard.press("End");
      await expect
        .poll(() =>
          player.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBe(8);
      await page.keyboard.press("Home");
      await expect
        .poll(() =>
          player.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBe(0);
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() =>
          player.evaluate((audio: HTMLAudioElement) => audio.currentTime),
        )
        .toBeGreaterThan(0);
      await page.keyboard.press("ArrowDown");
      await expect
        .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.volume))
        .toBeLessThan(1);
      await page.keyboard.press("ArrowUp");
      await expect
        .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.volume))
        .toBe(1);
    });

    // SRC: https://github.com/percebus/hello-spec-kit/issues/13
    for (const episode of episodes) {
      test(`play, inspect and return from episode ${episode.episodeNumber}`, async ({
        page,
      }) => {
        await page.goto("/hello-spec-kit/episodes/");
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          ),
        ).toBeLessThanOrEqual(0);
        const card = page.getByRole("article").filter({
          has: page.getByRole("heading", { name: episode.title, exact: true }),
        });
        await operatePlayerWithKeyboard(page, card.locator("audio[controls]"));
        await focusWithKeyboard(
          page,
          card.getByRole("link", { name: "View episode", exact: true }),
        );
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(new RegExp(`/episodes/${episode.slug}/$`));
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: episode.title,
            exact: true,
          }),
        ).toBeVisible();
        await operatePlayerWithKeyboard(page, page.locator("audio[controls]"));
        await focusWithKeyboard(
          page,
          page.getByRole("link", { name: "Back to all episodes" }),
        );
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/hello-spec-kit\/episodes\/$/);
      });
    }

    test("starting another episode stops the previous player", async ({
      page,
    }) => {
      await page.goto("/hello-spec-kit/episodes/");
      const players = page.locator("audio[controls]");
      await expect(players).toHaveCount(20);
      await focusWithKeyboard(page, players.nth(0));
      await page.keyboard.press("Space");
      await expect
        .poll(() =>
          players.nth(0).evaluate((audio: HTMLAudioElement) => audio.paused),
        )
        .toBe(false);
      await focusWithKeyboard(page, players.nth(1));
      await page.keyboard.press("Space");
      await expect
        .poll(() =>
          players.nth(1).evaluate((audio: HTMLAudioElement) => audio.paused),
        )
        .toBe(false);
      await expect
        .poll(() =>
          players.nth(0).evaluate((audio: HTMLAudioElement) => audio.paused),
        )
        .toBe(true);
      await focusWithKeyboard(
        page,
        page
          .getByRole("navigation")
          .getByRole("link", { name: "About", exact: true }),
      );
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/about\/$/);
      await expect(page.locator("audio")).toHaveCount(0);
    });

    test("a failed preview explains the error without blocking keyboard navigation", async ({
      page,
    }) => {
      await page.goto("/hello-spec-kit/");
      await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
      await page.locator("audio").evaluate((audio: HTMLAudioElement) => {
        audio.src = "data:audio/wav;base64,AAAA";
        audio.load();
      });
      await expect(page.getByRole("article").getByRole("alert")).toHaveText(
        "The audio preview for Designing for Trust is unavailable. Please try another episode.",
      );
      await focusWithKeyboard(
        page,
        page.getByRole("link", { name: "Browse all episodes", exact: true }),
      );
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/episodes\/$/);
    });
  });
}
