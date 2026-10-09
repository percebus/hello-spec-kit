import { expect, type Locator, type Page } from "@playwright/test";

export async function focusWithKeyboard(page: Page, target: Locator) {
  for (let attempt = 0; attempt < 250; attempt += 1) {
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      await expect(target).toBeVisible();
      await expect(target).toBeInViewport();
      const outline = await target.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          visible: element.matches(":focus-visible"),
          style: style.outlineStyle,
          width: Number.parseFloat(style.outlineWidth),
          color: style.outlineColor,
        };
      });
      expect(outline.visible).toBe(true);
      expect(outline.style).not.toBe("none");
      expect(outline.width).toBeGreaterThanOrEqual(2);
      expect(outline.color).not.toBe("rgba(0, 0, 0, 0)");
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error(
    `Control is not reachable by Tab: ${await target.evaluate((element) => element.outerHTML)}`,
  );
}

export async function operatePlayerWithKeyboard(page: Page, player: Locator) {
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.readyState))
    .toBeGreaterThanOrEqual(2);
  await focusWithKeyboard(page, player);
  await page.keyboard.press("Space");
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.paused))
    .toBe(false);
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.currentTime))
    .toBeGreaterThan(0);
  await page.keyboard.press("Space");
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.paused))
    .toBe(true);
}
