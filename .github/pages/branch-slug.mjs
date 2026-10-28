#!/usr/bin/env node
// Branch name → R&D subsite slug. See
// specs/002-pr-preview-verification/research.md (R8).
import { createHash } from "node:crypto";

export const MAX_SLUG_LENGTH = 63;
const HASHED_PREFIX_LENGTH = 54;
const HASH_LENGTH = 8;
export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
export const RESERVED_SLUGS = new Set([
  "index.html",
  "404.html",
  "subsites.json",
]);

export function branchSlug(branch) {
  if (typeof branch !== "string" || branch.length === 0) {
    throw new Error("Branch name is required");
  }

  const flattened = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (flattened.length <= MAX_SLUG_LENGTH) {
    return flattened;
  }

  const hash = createHash("sha256")
    .update(branch)
    .digest("hex")
    .slice(0, HASH_LENGTH);
  const prefix = flattened.slice(0, HASHED_PREFIX_LENGTH).replace(/-+$/, "");
  return `${prefix}-${hash}`;
}

export function assertAllowed(slug, branch) {
  if (!slug) {
    throw new Error(`Branch "${branch}" does not produce a usable address`);
  }
  if (slug === "main" && branch !== "main") {
    throw new Error(`Branch "${branch}" maps to the reserved address "main"`);
  }
  if (
    slug.startsWith("_") ||
    slug.startsWith(".") ||
    RESERVED_SLUGS.has(slug)
  ) {
    throw new Error(
      `Branch "${branch}" maps to the reserved address "${slug}"`,
    );
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Address "${slug}" for branch "${branch}" is invalid`);
  }
  return slug;
}

export function allowedBranchSlug(branch) {
  return assertAllowed(branchSlug(branch), branch);
}

// Avoids `import.meta` so Playwright's CommonJS transform can import this file.
const invokedDirectly = /[\\/]branch-slug\.mjs$/.test(process.argv[1] ?? "");

if (invokedDirectly) {
  const branch = process.argv[2];
  try {
    process.stdout.write(`${allowedBranchSlug(branch)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
