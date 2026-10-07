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

Given("the featured episode", async ({ page }) => {
  await expect(getFeaturedEpisode(page)).toHaveCount(1);
});

When("the feature episode loads", async ({ page }) => {
  await expect(getFeaturedEpisode(page)).toBeVisible();
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

Then("it provides playback controls", async ({ page }) => {
  const player = getFeaturedEpisode(page).locator("audio[controls]");

  await expect(player).toHaveAttribute(
    "aria-label",
    "Play Designing for Trust",
  );
  await expect(player).toHaveAttribute("src", /^blob:/);
});

Then(/^it shows (.+) its title$/, async ({ page }, element: string) => {
  const featuredEpisode = getFeaturedEpisode(page);

  switch (element) {
    case "title":
      await expect(
        featuredEpisode.getByRole("heading", {
          level: 2,
          name: "Designing for Trust",
        }),
      ).toBeVisible();
      break;
    case "artwork":
      await expect(featuredEpisode.getByRole("img")).toHaveAttribute(
        "alt",
        /trust/i,
      );
      break;
    case "publication date":
      await expect(featuredEpisode).toContainText("September 28, 2026");
      break;
    case "duration":
      await expect(featuredEpisode).toContainText("32 min");
      break;
    case "summary":
      await expect(
        featuredEpisode.getByText(/small interface choices/i),
      ).toBeVisible();
      break;
    default:
      throw new Error(`Unsupported featured episode element: ${element}`);
  }
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
    page.getByRole("heading", { level: 1, name: "Episodes" }),
  ).toBeVisible();
});
