import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();
const currentQuestions = new WeakMap<Page, string>();

const MAX_SENTENCES = 2;
const MAX_WORDS = 30;

function getItem(page: Page, question: string) {
  return page
    .getByRole("region", { name: "Frequently asked questions" })
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: question }) });
}

Given("the FAQ page", async ({ page }) => {
  await page.goto("faq/");
});

When("the FAQ page loads", async ({ page }) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "Frequently asked questions" }),
  ).toBeVisible();
});

Then("the question {string} is listed", async ({ page }, question: string) => {
  const item = getItem(page, question);

  await expect(item).toHaveCount(1);
  await expect(item.locator("summary")).toHaveText(question);
  currentQuestions.set(page, question);
});

Then("its answer is concise", async ({ page }) => {
  const question = currentQuestions.get(page);

  if (!question) {
    throw new Error("No question is currently selected.");
  }

  const answers = getItem(page, question).locator("p");

  await expect(answers).toHaveCount(1);

  const answer = (await answers.textContent())?.trim() ?? "";
  const words = answer.split(/\s+/).filter(Boolean);
  const sentences = answer.split(/[.!?]+/).filter((s) => s.trim());

  expect(words.length).toBeGreaterThan(0);
  expect(words.length).toBeLessThanOrEqual(MAX_WORDS);
  expect(sentences.length).toBeLessThanOrEqual(MAX_SENTENCES);
});
