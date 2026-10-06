import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();
const currentSections = new WeakMap<Page, string>();

function getSection(page: Page, section: string) {
  const about = page.getByRole("region", {
    name: "About Signal & Story",
  });
  const heading = about.getByRole("heading", {
    level: 2,
    name: section,
    exact: true,
  });

  return { heading, panel: heading.locator("..") };
}

Given("the about page", async ({ page }) => {
  await page.goto("/hello-spec-kit/about/");
});

When("it loads", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "About the show" }),
  ).toBeVisible();
});

Then(/^the (.+) section is visible$/, async ({ page }, section: string) => {
  const { heading } = getSection(page, section);

  await expect(heading).toBeVisible();
  currentSections.set(page, section);
});

Then("it has some description", async ({ page }) => {
  const section = currentSections.get(page);

  if (!section) {
    throw new Error("No visible section is available to describe.");
  }

  const description = getSection(page, section).panel.getByRole("paragraph");

  await expect(description).toBeVisible();
  await expect(description).toHaveText(/\S/);
});
