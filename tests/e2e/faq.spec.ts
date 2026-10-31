import { expect, test } from "@playwright/test";

const questions = [
  {
    topic: "the show",
    question: "What is Signal & Story about?",
  },
  {
    topic: "the publishing schedule",
    question: "When are new episodes published?",
  },
  {
    topic: "listening options",
    question: "Where can I listen?",
  },
  {
    topic: "contact expectations",
    question: "How can I suggest a guest or topic?",
  },
] as const;

test.describe("FR-012: the FAQ answers common questions", () => {
  // Source: https://github.com/percebus/hello-spec-kit/issues/32
  for (const { topic, question } of questions) {
    test(`answers questions about ${topic}`, async ({ page }) => {
      await page.goto("./faq/");

      const item = page
        .locator(".faq-list details")
        .filter({ has: page.getByText(question, { exact: true }) });

      await expect(item).toHaveCount(1);
      await item.locator("summary").click();
      await expect(item.locator("p")).toHaveText(/\S/);
    });
  }
});
