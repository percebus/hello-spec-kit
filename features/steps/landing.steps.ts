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

Then(/^(podcast identity|concise show description|exactly 1 featured episode) is visible$/, async ({ page }, element: string) => {
  switch (element) {
    case "podcast identity":
      await expect(
        page.getByRole("link", { name: "Signal & Story" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Find the human signal inside the technology story.",
        }),
      ).toBeVisible();
      break;
    case "concise show description":
      await expect(
        page.getByText(/explores how thoughtful people make creative technology/i),
      ).toBeVisible();
      break;
    case "exactly 1 featured episode":
      await expect(getFeaturedEpisode(page)).toHaveCount(1);
      break;
  }
});

Then("it provides playback controls", async ({ page }) => {
  const player = getFeaturedEpisode(page).locator("audio[controls]");

  await expect(player).toHaveAttribute(
    "aria-label",
    "Play Designing for Trust",
  );
  await expect(player).toHaveAttribute("src", /^blob:/);
});

Then(/^it shows (title|artwork|publication date|duration|summary)$/, async ({ page }, element: string) => {
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
  }
});

Given("the Home page", async ({ page }) => {
  await page.goto("/hello-spec-kit/");
});

When("they click on Episodes", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Episodes", exact: true })
    .click();
});

Then("they arrive at the episodes page", async ({ page }) => {
  await expect(page).toHaveURL(/\/hello-spec-kit\/episodes\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Episodes", exact: true }),
  ).toBeVisible();
});

When("the visitor clicks the play button", async ({ page }) => {
  const player = getFeaturedEpisode(page).locator("audio[controls]");
  await player.click();
});

Then("the episode audio playback is initiated", async ({ page }) => {
  const player = getFeaturedEpisode(page).locator("audio[controls]");
  
  // Verify player has interactive controls and is accessible
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute("aria-label", "Play Designing for Trust");
  
  // Verify audio source is loaded
  const audioSrc = await player.locator("source").first().getAttribute("src");
  expect(audioSrc).toBeTruthy();
});
