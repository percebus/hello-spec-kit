import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given("a visitor opens the about page", async ({ page }) => {
  await page.goto("/hello-spec-kit/about/");
});

When("the page loads", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "About the show" }),
  ).toBeVisible();
});

Then(
  "they see the show's purpose, topics, intended audience, and creator or host information.",
  async ({ page }) => {
    const about = page.getByRole("region", {
      name: "About Signal & Story",
    });

    await expect(about.getByRole("heading", { name: "Purpose" })).toBeVisible();
    await expect(
      about.getByText(
        "We move past launch-day headlines to understand how useful, responsible products are shaped over time.",
      ),
    ).toBeVisible();

    await expect(about.getByRole("heading", { name: "Topics" })).toBeVisible();
    await expect(
      about.getByText(
        "Expect conversations about product design, engineering, creative practice, accessibility, leadership, and emerging technology.",
      ),
    ).toBeVisible();

    await expect(
      about.getByRole("heading", { name: "For whom" }),
    ).toBeVisible();
    await expect(
      about.getByText(
        "The show is made for curious designers, developers, founders, researchers, and anyone interested in thoughtful digital work.",
      ),
    ).toBeVisible();

    await expect(
      about.getByRole("heading", { name: "Your host" }),
    ).toBeVisible();
    await expect(
      about.getByText(
        "Mara Velez is a product strategist and lifelong interviewer who believes the best technology stories begin with better questions.",
      ),
    ).toBeVisible();
  },
);
