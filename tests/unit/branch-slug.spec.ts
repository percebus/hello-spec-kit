import { expect, test } from "@playwright/test";
import {
  allowedBranchSlug,
  branchSlug,
  SLUG_PATTERN,
} from "../../scripts/branch-slug.mjs";

test.describe("branchSlug", () => {
  for (const [branch, slug] of [
    ["feat/see-website", "feat-see-website"],
    ["feat/a/b/c", "feat-a-b-c"],
    ["feat/a-b/c", "feat-a-b-c"],
    ["feat/a/b-c", "feat-a-b-c"],
    ["Feat/X", "feat-x"],
    ["main", "main"],
  ] as const) {
    test(`${branch} → ${slug}`, () => {
      expect(branchSlug(branch)).toBe(slug);
      expect(slug).toMatch(SLUG_PATTERN);
    });
  }

  test("long names get a stable, distinct hash suffix", () => {
    const prefix = "feat/podcast/player/keyboard-navigation/focus-ring/";
    const desktop = branchSlug(`${prefix}visibility-desktop`);
    const mobile = branchSlug(`${prefix}visibility-mobile`);

    for (const slug of [desktop, mobile]) {
      expect(slug).toHaveLength(63);
      expect(slug).toMatch(/-[0-9a-f]{8}$/);
      expect(slug).toMatch(SLUG_PATTERN);
    }
    expect(desktop).not.toBe(mobile);
    expect(branchSlug(`${prefix}visibility-desktop`)).toBe(desktop);
  });
});

test.describe("allowedBranchSlug", () => {
  test("allows main only for the main branch", () => {
    expect(allowedBranchSlug("main")).toBe("main");
    expect(() => allowedBranchSlug("Main")).toThrow(/reserved/);
    expect(() => allowedBranchSlug("main/")).toThrow(/reserved/);
  });

  for (const branch of ["///", "--", "_"]) {
    test(`rejects "${branch}" (no usable address)`, () => {
      expect(() => allowedBranchSlug(branch)).toThrow(/usable address/);
    });
  }

  test("flattening can never produce reserved root names", () => {
    expect(allowedBranchSlug("_x")).toBe("x");
    expect(allowedBranchSlug(".x")).toBe("x");
    expect(allowedBranchSlug("index.html")).toBe("index-html");
    expect(allowedBranchSlug("subsites.json")).toBe("subsites-json");
  });
});
