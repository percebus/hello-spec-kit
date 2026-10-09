import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import {
  focusWithKeyboard,
  operatePlayerWithKeyboard,
} from "../../tests/helpers/keyboard";

const { Given, When, Then } = createBdd();

Given(
  "a physical keyboard and a {int} pixel wide display",
  async ({ page }, width: number) => {
    await page.setViewportSize({ width, height: 900 });
  },
);

When(
  "they play and pause the featured episode using only the keyboard",
  async ({ page }) => {
    await operatePlayerWithKeyboard(page, page.locator("audio[controls]"));
  },
);

Then(
  "they can open its details and return to the catalog using only the keyboard",
  async ({ page }) => {
    await focusWithKeyboard(
      page,
      page.getByRole("link", { name: "View episode details" }),
    );
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      /\/hello-spec-kit\/episodes\/designing-for-trust\/$/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Designing for Trust" }),
    ).toBeVisible();
    await operatePlayerWithKeyboard(page, page.locator("audio[controls]"));
    await focusWithKeyboard(
      page,
      page.getByRole("link", { name: "Back to all episodes" }),
    );
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/hello-spec-kit\/episodes\/$/);
  },
);
