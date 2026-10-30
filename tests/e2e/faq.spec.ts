import { expect, test } from "@playwright/test";

const questions = [
  {
    topic: "the show",
    question: "What is Signal & Story about?",
    answer:
      "The show explores the human decisions behind useful, creative, and responsible technology.",
  },
  {
    topic: "the publishing schedule",
    question: "When are new episodes published?",
    answer:
      "New conversations are published every other Tuesday, with occasional short field notes between episodes.",
  },
  {
    topic: "listening options",
    question: "Where can I listen?",
    answer:
      "You can explore every mocked episode on this website. Additional listening platforms are not connected in this demo.",
  },
  {
    topic: "contact expectations",
    question: "How can I suggest a guest or topic?",
    answer:
      "Guest and topic submissions are not collected in this demo. Future contact options will clearly explain expected response times.",
  },
] as const;

test.describe("FR-012: the FAQ answers common questions", () => {
  // Source: https://github.com/percebus/hello-spec-kit/issues/32
  for (const { topic, question, answer } of questions) {
    test(`answers questions about ${topic}`, async ({ page }) => {
      await page.goto("./faq/");

      const item = page
        .locator(".faq-list details")
        .filter({ has: page.getByText(question, { exact: true }) });

      await expect(item).toHaveCount(1);
      await item.locator("summary").click();
      await expect(item.locator("p")).toHaveText(answer);
    });
  }
});
