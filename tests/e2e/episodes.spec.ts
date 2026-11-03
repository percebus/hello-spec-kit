import { expect, test } from "@playwright/test";

test.describe("FR-008: every episode detail page exposes complete details", () => {
  // Source: https://github.com/percebus/hello-spec-kit/issues/35
  test("detail page shows title, artwork, date, duration, summary, and playback", async ({
    page,
  }) => {
    await page.goto("./episodes/");
    const slugs = await page
      .locator("article.episode-card a.text-link")
      .evaluateAll((links) =>
        links.map((link) =>
          link.getAttribute("href")!.split("/").filter(Boolean).pop()!,
        ),
      );
    expect(slugs.length).toBeGreaterThan(0);

    for (const slug of slugs) {
      await page.goto(`./episodes/${slug}/`);
      const detail = page.locator("article.episode-detail");

      await expect(detail.getByRole("heading", { level: 1 })).toHaveText(/\S/);

      const artwork = detail.locator("img");
      await expect(artwork).toBeVisible();
      await expect(artwork).toHaveAttribute("alt", "");
      await expect(detail.locator("img")).toHaveCount(1);
      expect(await artwork.getAttribute("src")).toContain(
        `/episodes/${slug}.svg`,
      );
      await expect
        .poll(() =>
          artwork.evaluate((image: HTMLImageElement) => image.naturalWidth),
        )
        .toBeGreaterThan(0);

      await expect(
        detail.locator(".episode-meta > div").nth(0).locator("dd"),
      ).toHaveText(/\S/);
      await expect(
        detail.locator(".episode-meta > div").nth(1).locator("dd"),
      ).toHaveText(/\S/);
      await expect(detail.locator(".episode-summary")).toHaveText(/\S/);

      const player = detail.locator("audio[controls]");
      await expect(player).toBeVisible();
      await expect(player).toHaveAttribute("aria-label", /^Play .+/);
    }
  });
});
