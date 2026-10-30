import { expect, test } from "@playwright/test";

test.describe("SC-008: every rendered episode card exposes complete details", () => {
  // Source: https://github.com/percebus/hello-spec-kit/issues/60
  test("all rendered cards show required content and playback controls", async ({
    page,
  }) => {
    await page.goto("./episodes/");

    const cards = page.locator("article.episode-card");
    await expect(cards.first()).toBeVisible();

    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
    const artworkSources = new Set<string>();

    for (let index = 0; index < cardCount; index += 1) {
      const card = cards.nth(index);
      await card.scrollIntoViewIfNeeded();

      await expect(card.getByRole("heading", { level: 2 })).toBeVisible();

      const artwork = card.getByRole("img");
      const episodeId = await card.getAttribute("data-episode-id");
      await expect(artwork).toBeVisible();
      await expect(artwork).toHaveAttribute("alt", /\S/);
      await expect(artwork).toHaveCSS("height", "300px");
      expect(episodeId).toBeTruthy();
      const artworkSource = await artwork.getAttribute("src");
      expect(artworkSource).toContain(`/episodes/${episodeId}.svg`);
      artworkSources.add(artworkSource!);
      await expect
        .poll(() =>
          artwork.evaluate((image: HTMLImageElement) => image.naturalWidth),
        )
        .toBeGreaterThan(0);

      await expect(card.getByText("Published", { exact: true })).toBeVisible();
      await expect(
        card.locator(".episode-meta > div").nth(0).locator("dd"),
      ).toHaveText(/\S/);
      await expect(card.getByText("Duration", { exact: true })).toBeVisible();
      await expect(
        card.locator(".episode-meta > div").nth(1).locator("dd"),
      ).toHaveText(/\S/);
      await expect(card.locator(".episode-summary")).toHaveText(/\S/);

      const player = card.locator("audio[controls]");
      await expect(player).toBeVisible();
      await expect(player).toHaveAttribute("aria-label", /^Play .+/);
    }

    expect(artworkSources.size).toBe(cardCount);
  });
});

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

      const artwork = detail.getByRole("img");
      await expect(artwork).toBeVisible();
      await expect(artwork).toHaveAttribute("alt", /\S/);
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

// FR-010: https://github.com/percebus/hello-spec-kit/issues/37
test("clearly identifies the playing episode", async ({ page }) => {
  await page.goto("./episodes/");
  const cards = page.locator(".episode-card");
  const first = cards.nth(0);
  const second = cards.nth(1);

  await first.locator("audio").evaluate((a: HTMLAudioElement) => a.play());
  await expect(first.locator(".episode-player-status")).toContainText(
    "Now playing",
  );
  await expect(first.locator("audio")).toHaveAttribute("data-playing", "true");

  await second.locator("audio").evaluate((a: HTMLAudioElement) => a.play());
  await expect(second.locator(".episode-player-status")).toContainText(
    "Now playing",
  );
  await expect(first.locator(".episode-player-status")).toBeEmpty();
  await expect(first.locator("audio")).toHaveAttribute("data-playing", "false");
});
