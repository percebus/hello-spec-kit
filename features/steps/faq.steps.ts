import { expect, type Locator, type Page } from "@playwright/test";
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

When("the visitor clicks each FAQ question in turn", async ({ page }) => {
  const disclosures = page.locator(".faq-list details");
  const questionCount = await disclosures.count();
  let previousSummary: Locator | undefined;

  expect(questionCount).toBeGreaterThan(0);

  for (let index = 0; index < questionCount; index += 1) {
    const disclosure = disclosures.nth(index);
    const summary = disclosure.locator("summary");

    if (previousSummary) {
      await previousSummary.click();
    }

    await summary.click();
    await expect(disclosure).toHaveAttribute("open", "");
    await expect(disclosure.locator("p")).toBeVisible();

    for (let otherIndex = 0; otherIndex < questionCount; otherIndex += 1) {
      if (otherIndex === index) {
        continue;
      }

      const otherDisclosure = disclosures.nth(otherIndex);
      await expect(otherDisclosure).not.toHaveAttribute("open", "");
      await expect(otherDisclosure.locator("p")).toBeHidden();
    }

    previousSummary = summary;
    currentQuestions.set(page, (await summary.innerText()).trim());
  }
});

Then(
  "the last answer is visible and all other answers are collapsed",
  async ({ page }) => {
    const { disclosure } = getQuestion(page);
    const disclosures = page.locator(".faq-list details");
    const questionCount = await disclosures.count();

    await expect(disclosure.locator("p")).toBeVisible();
    await expect(disclosure).toHaveAttribute("open", "");

    for (let index = 0; index < questionCount - 1; index += 1) {
      await expect(disclosures.nth(index)).not.toHaveAttribute("open", "");
      await expect(disclosures.nth(index).locator("p")).toBeHidden();
    }
  },
);

When("the visitor clicks the last question again", async ({ page }) => {
  const { summary } = getQuestion(page);

  await summary.click();
});

Then("every FAQ answer is collapsed", async ({ page }) => {
  const disclosures = page.locator(".faq-list details");
  const questionCount = await disclosures.count();

  for (let index = 0; index < questionCount; index += 1) {
    const disclosure = disclosures.nth(index);
    await expect(disclosure).not.toHaveAttribute("open", "");
    await expect(disclosure.locator("p")).toBeHidden();
  }
});

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
