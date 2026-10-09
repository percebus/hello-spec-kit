import { expect, type Locator, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { When, Then } = createBdd();
const focusedEpisodeActions = new WeakMap<Page, string[]>();

function getFeaturedEpisode(page: Page) {
  return page.getByRole("article").filter({
    has: page.getByText("Featured episode", { exact: true }),
  });
}

async function isFocused(locator: Locator) {
  return locator.evaluate((element) => element === document.activeElement);
}

async function expectVisibleFocus(page: Page, action: string) {
  const focused = page.locator(":focus");

  await expect(focused, `${action} receives keyboard focus`).toBeVisible();

  const hasVisibleFocus = await focused.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const outlineWidth = Number.parseFloat(style.outlineWidth);
    const hasOutline =
      style.outlineStyle !== "none" &&
      outlineWidth > 0 &&
      style.outlineColor !== "rgba(0, 0, 0, 0)";
    const hasBoxShadow = style.boxShadow !== "none";

    return hasOutline || hasBoxShadow;
  });

  expect(hasVisibleFocus, `${action} shows a visible focus state`).toBe(true);
}

async function focusWithKeyboard(page: Page, locator: Locator, action: string) {
  const target = locator.first();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isFocused(target)) {
      await expectVisibleFocus(page, action);
      return;
    }

    await page.keyboard.press("Tab");
  }

  throw new Error(`${action} was not reachable by keyboard.`);
}

function rememberAction(page: Page, action: string) {
  focusedEpisodeActions.set(page, [
    ...(focusedEpisodeActions.get(page) ?? []),
    action,
  ]);
}

When(
  "they move through episode actions using only the keyboard",
  async ({ page }) => {
    const featuredEpisode = getFeaturedEpisode(page);
    const player = featuredEpisode.locator("audio[controls]");
    const detailsLink = featuredEpisode.getByRole("link", {
      name: /View episode details/,
    });

    await focusWithKeyboard(page, player, "featured episode player");
    rememberAction(page, "featured episode player");

    await focusWithKeyboard(page, detailsLink, "featured episode details link");
    rememberAction(page, "featured episode details link");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(
      /\/hello-spec-kit\/episodes\/designing-for-trust\/$/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Designing for Trust" }),
    ).toBeVisible();
  },
);

Then(
  "every episode action is reachable, visibly focused, and operable",
  async ({ page }) => {
    await expect(page).toHaveURL(
      /\/hello-spec-kit\/episodes\/designing-for-trust\/$/,
    );
    expect(focusedEpisodeActions.get(page)).toEqual([
      "featured episode player",
      "featured episode details link",
    ]);
  },
);

When(
  "they return to all episodes using only the keyboard",
  async ({ page }) => {
    const backLink = page.getByRole("link", { name: "Back to all episodes" });

    await focusWithKeyboard(page, backLink, "back to all episodes link");
    rememberAction(page, "back to all episodes link");
    await page.keyboard.press("Enter");
  },
);
