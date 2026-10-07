import { expect, test } from "@playwright/test";

test.describe("SC-001: identify the show topic and featured episode", () => {
  test("key landing content is identifiable within 10 seconds", async ({
    page,
  }) => {
    test.setTimeout(10_000);

    await page.goto("/hello-spec-kit/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Find the human signal inside the technology story.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /explores how thoughtful people make creative technology/i,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("article").filter({
        has: page.getByText("Featured episode", { exact: true }),
      }),
    ).toHaveCount(1);
  });
});
