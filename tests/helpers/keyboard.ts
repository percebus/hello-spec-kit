import { expect, type Locator, type Page } from "@playwright/test";

export async function expectVisibleFocus(target: Locator) {
  await expect(target).toBeFocused();
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
}

export function isWebKit(page: Page) {
  return page.context().browser()?.browserType().name() === "webkit";
}

// On macOS, WebKit's Tab skips links unless Option (Alt) is held.
function tabModifier(page: Page) {
  return isWebKit(page) ? "Alt+" : "";
}

async function isFocused(target: Locator) {
  return target.evaluate((element) => element === document.activeElement);
}

const isPaused = (player: Locator) =>
  player.evaluate((audio: HTMLAudioElement) => audio.paused);

// Focuses the player by keyboard and presses Space to start playback.
// WebKit makes the <audio> element itself a tab stop that ignores keys, and its
// play button's position among the control's inner tab stops depends on the
// player's width, so walk those stops until Space starts playback.
export async function startPlaybackWithKeyboard(page: Page, player: Locator) {
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.readyState))
    .toBeGreaterThanOrEqual(1);
  await focusWithKeyboard(page, player);
  if (!isWebKit(page)) {
    await page.keyboard.press("Space");
    await expect.poll(() => isPaused(player)).toBe(false);
    return;
  }
  const modifier = tabModifier(page);
  for (let attempt = 0; attempt < 20 && (await isFocused(player)); attempt++) {
    await page.keyboard.press(`${modifier}Shift+Tab`);
  }
  await page.keyboard.press(`${modifier}Tab`);
  await expectVisibleFocus(player);
  for (let stop = 0; stop < 10; stop++) {
    await page.keyboard.press(`${modifier}Tab`);
    if (!(await isFocused(player))) {
      break;
    }
    const muted = () =>
      player.evaluate((audio: HTMLAudioElement) => audio.muted);
    const wasMuted = await muted();
    await page.keyboard.press("Space");
    try {
      await expect.poll(() => isPaused(player), { timeout: 1500 }).toBe(false);
      return;
    } catch {
      if ((await muted()) !== wasMuted) {
        await page.keyboard.press("Space");
      }
    }
  }
  throw new Error(
    `Player cannot be started by keyboard: ${await player.evaluate((element) => element.outerHTML)}`,
  );
}

export async function focusWithKeyboard(page: Page, target: Locator) {
  const forward = await target.evaluate((element) => {
    const activeElement = document.activeElement;
    return Boolean(
      activeElement &&
      activeElement.compareDocumentPosition(element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
  const modifier = tabModifier(page);
  const direction = `${modifier}${forward ? "Tab" : "Shift+Tab"}`;

  for (let attempt = 0; attempt < 250; attempt += 1) {
    if (await isFocused(target)) {
      await expectVisibleFocus(target);
      return;
    }
    await page.keyboard.press(direction);
  }
  throw new Error(
    `Control is not reachable by keyboard: ${await target.evaluate((element) => element.outerHTML)}`,
  );
}

export async function operatePlayerWithKeyboard(page: Page, player: Locator) {
  await startPlaybackWithKeyboard(page, player);
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.currentTime))
    .toBeGreaterThan(0);
  await page.keyboard.press("Space");
  await expect
    .poll(() => player.evaluate((audio: HTMLAudioElement) => audio.paused))
    .toBe(true);
}
