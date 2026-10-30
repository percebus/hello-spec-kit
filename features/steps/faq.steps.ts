import { expect, type Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();
const currentQuestions = new WeakMap<Page, string>();

function getQuestion(page: Page) {
  const question = currentQuestions.get(page);

  if (!question) {
    throw new Error("No FAQ question is currently selected.");
  }

  const summary = page.locator("summary").filter({ hasText: question });

  return { summary, disclosure: summary.locator("..") };
}

Given("the FAQ page", async ({ page }) => {
  await page.goto("faq/");
});

Given(
  "the {string} question is collapsed",
  async ({ page }, question: string) => {
    const summary = page.locator("summary").filter({ hasText: question });
    const disclosure = summary.locator("..");

    await expect(summary).toBeVisible();
    await expect(disclosure).not.toHaveAttribute("open", "");
    await expect(disclosure.locator("p")).toBeHidden();
    currentQuestions.set(page, question);
  },
);

When(
  "the visitor toggles that question with {string}",
  async ({ page }, input: string) => {
    const { summary } = getQuestion(page);

    if (input === "keyboard") {
      await summary.focus();
      await page.keyboard.press("Enter");
    } else if (input === "pointer") {
      await summary.click();
    } else {
      throw new Error(`Unsupported FAQ input: ${input}`);
    }
  },
);

Then("its answer is visible and the control is expanded", async ({ page }) => {
  const { summary, disclosure } = getQuestion(page);

  await expect(disclosure.locator("p")).toBeVisible();
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(summary).toBeVisible();
});

Then("its answer is hidden and the control is collapsed", async ({ page }) => {
  const { summary, disclosure } = getQuestion(page);

  await expect(disclosure.locator("p")).toBeHidden();
  await expect(disclosure).not.toHaveAttribute("open", "");
  await expect(summary).toBeVisible();
});
