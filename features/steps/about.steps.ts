import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given("the about page", async ({ page }) => {
  await page.goto("/hello-spec-kit/about/");
});

When("it loads", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "About the show" }),
  ).toBeVisible();
});

Then(/^the (.+) section is visible$/, async ({ page }, section: string) => {
  const about = page.getByRole("region", {
    name: "About Signal & Story",
  });
  const heading = about.getByRole("heading", {
    level: 2,
    name: section,
    exact: true,
  });
  const panel = heading.locator("..");

  await expect(heading).toBeVisible();
  await expect(panel.getByRole("paragraph")).toBeVisible();
  await expect(panel.getByRole("paragraph")).toHaveText(/\S/);
});
