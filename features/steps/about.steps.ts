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

function getCurrentSection(page: Page) {
  const section = currentSections.get(page);

  if (!section) {
    throw new Error("No section is currently selected.");
  }

  return getSection(page, section);
}

Given("the about page", async ({ page }) => {
  await page.goto("about/");
});

Given("the {string} section", async ({ page }, section: string) => {
  const { heading } = getSection(page, section);

  await expect(heading).toBeVisible();
  currentSections.set(page, section);
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
  const description = getCurrentSection(page)
    .panel.getByRole("paragraph")
    .first();

  await expect(description).toBeVisible();
  await expect(description).toHaveText(/\S/);
});

Then("there is alt text available", async ({ page }) => {
  await expect(getCurrentSection(page).panel.getByRole("img")).toHaveAttribute(
    "alt",
    /\S/,
  );
});

Then("it reads {string}", async ({ page }, altText: string) => {
  await expect(getCurrentSection(page).panel.getByRole("img")).toHaveAttribute(
    "alt",
    altText,
  );
});
