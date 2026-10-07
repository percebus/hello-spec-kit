import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

function getFeaturedEpisode(page: Page) {
  return page.getByRole("article").filter({
    has: page.getByText("Featured episode", { exact: true }),
  });
}

Given("the landing page", async ({ page }) => {
  await page.goto("/hello-spec-kit/");
});

When("the landing page loads", async ({ page }) => {
  await expect(page).toHaveTitle(/Signal & Story/);
});

Then("the podcast identity is visible", async ({ page }) => {
  await expect(
    page.getByRole("link", { name: "Signal & Story" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find the human signal inside the technology story.",
    }),
  ).toBeVisible();
});

Then("a concise show description is visible", async ({ page }) => {
  await expect(
    page.getByText(/explores how thoughtful people make creative technology/i),
  ).toBeVisible();
});

Then("exactly one featured episode is visible", async ({ page }) => {
  await expect(getFeaturedEpisode(page)).toHaveCount(1);
});

Then("the featured episode shows its title", async ({ page }) => {
  await expect(
    getFeaturedEpisode(page).getByRole("heading", {
      level: 2,
      name: "Designing for Trust",
    }),
  ).toBeVisible();
});

Then("the featured episode shows its artwork", async ({ page }) => {
  await expect(getFeaturedEpisode(page).getByRole("img")).toHaveAttribute(
    "alt",
    /trust/i,
  );
});

Then("the featured episode shows its publication date", async ({ page }) => {
  await expect(getFeaturedEpisode(page)).toContainText("September 28, 2026");
});

Then("the featured episode shows its duration", async ({ page }) => {
  await expect(getFeaturedEpisode(page)).toContainText("32 min");
});

Then("the featured episode shows its summary", async ({ page }) => {
  await expect(
    getFeaturedEpisode(page).getByText(/small interface choices/i),
  ).toBeVisible();
});

Then("the featured episode provides playback controls", async ({ page }) => {
  const player = getFeaturedEpisode(page).locator("audio[controls]");

  await expect(player).toHaveAttribute(
    "aria-label",
    "Play Designing for Trust",
  );
  await expect(player).toHaveAttribute("src", /^blob:/);
});

When(
  "the visitor follows the primary episodes call to action",
  async ({ page }) => {
    await page
      .getByRole("link", { name: "Browse all episodes", exact: true })
      .click();
  },
);

Then("the episodes page loads", async ({ page }) => {
  await expect(page).toHaveURL(/\/hello-spec-kit\/episodes\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "All episodes" }),
  ).toBeVisible();
});
