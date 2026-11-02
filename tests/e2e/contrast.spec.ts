import { expect, test, type Locator, type Page } from "@playwright/test";
import { focusWithKeyboard } from "../helpers/keyboard";

// FR-015: Text and essential controls MUST meet WCAG 2.2 AA contrast thresholds.
// SRC: https://github.com/percebus/hello-spec-kit/issues/40

const pages = ["/", "/episodes/", "/about/", "/faq/"] as const;

type Rgb = [number, number, number];

function parse(color: string): Rgb {
  const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
  return [r, g, b];
}

function luminance([r, g, b]: Rgb) {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: string, b: string) {
  const [high, low] = [luminance(parse(a)), luminance(parse(b))].sort(
    (x, y) => y - x,
  );
  return (high + 0.05) / (low + 0.05);
}

async function backgroundOf(target: Locator) {
  return target.evaluate((element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const color = getComputedStyle(node).backgroundColor;
      if (!/rgba\(.*,\s*0\)$/.test(color) && color !== "transparent") {
        return color;
      }
    }
    return getComputedStyle(document.documentElement).backgroundColor;
  });
}

async function textSamples(page: Page) {
  return page.locator("body *:visible").evaluateAll((elements) =>
    elements
      .filter((element) =>
        [...element.childNodes].some(
          (node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        ),
      )
      .map((element, index) => {
        element.setAttribute("data-contrast-sample", String(index));
        const style = getComputedStyle(element);
        const size = Number.parseFloat(style.fontSize);
        const bold = Number.parseInt(style.fontWeight, 10) >= 700;
        return {
          index,
          text: element.textContent!.trim().slice(0, 40),
          color: style.color,
          large: size >= 24 || (bold && size >= 18.66),
        };
      }),
  );
}

for (const width of [320, 1440]) {
  test.describe(`FR-015: ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
    });

    for (const path of pages) {
      test(`${path} text meets AA contrast`, async ({ page }) => {
        await page.goto(`.${path}`);
        const samples = await textSamples(page);
        expect(samples.length).toBeGreaterThan(0);
        for (const sample of samples) {
          const background = await backgroundOf(
            page.locator(`[data-contrast-sample="${sample.index}"]`),
          );
          const ratio = contrast(sample.color, background);
          expect(
            ratio,
            `"${sample.text}" ${sample.color} on ${background}`,
          ).toBeGreaterThanOrEqual(sample.large ? 3 : 4.5);
        }
      });

      test(`${path} focus indicators meet 3:1 contrast`, async ({ page }) => {
        await page.goto(`.${path}`);
        const targets = page.locator(
          "a:visible, button:visible, summary:visible",
        );
        const count = await targets.count();
        expect(count).toBeGreaterThan(0);
        for (let index = 0; index < count; index += 1) {
          const target = targets.nth(index);
          await focusWithKeyboard(page, target);
          const outline = await target.evaluate(
            (element) => getComputedStyle(element).outlineColor,
          );
          const parent = target.locator("xpath=..");
          const background = await backgroundOf(parent);
          expect(
            contrast(outline, background),
            `focus ${outline} on ${background}`,
          ).toBeGreaterThanOrEqual(3);
        }
      });
    }

    for (const path of ["/", "/episodes/"]) {
      test(`${path} playback status meets AA contrast`, async ({ page }) => {
        await page.goto(`.${path}`);
        const player = page.locator("audio").first();
        await player.evaluate((audio: HTMLAudioElement) => audio.play());
        const status = page.locator(".episode-player-status").first();
        await expect(status).toContainText("Now playing");
        const color = await status.evaluate(
          (element) => getComputedStyle(element).color,
        );
        const background = await backgroundOf(status);
        expect(
          contrast(color, background),
          `status ${color} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      });
    }

    test("FAQ disclosure controls have a 3:1 boundary", async ({ page }) => {
      await page.goto("./faq/");
      const details = page.locator(".faq-list details");
      for (const item of await details.all()) {
        const border = await item.evaluate(
          (element) => getComputedStyle(element).borderTopColor,
        );
        const background = await backgroundOf(item.locator("xpath=.."));
        expect(contrast(border, background)).toBeGreaterThanOrEqual(3);
      }
    });
  });
}
