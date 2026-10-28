import { expect, test } from "@playwright/test";

const pr = process.env.PREVIEW_PR;
const ref = process.env.PREVIEW_REF;
const sha = process.env.PREVIEW_SHA;

test("preview banner identifies the pull request build", async ({ page }) => {
  test.skip(
    !pr || !ref || !sha,
    "PREVIEW_PR, PREVIEW_REF and PREVIEW_SHA are required",
  );

  await page.goto("./");

  const banner = page.getByRole("complementary", { name: "Preview build" });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(`PR #${pr}`);
  await expect(banner).toContainText(ref!);
  await expect(banner).toContainText(sha!.slice(0, 7));
});
