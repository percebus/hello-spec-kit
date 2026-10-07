import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

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
