#!/usr/bin/env node
// Maintains the R&D site tree on the gh-pages storage branch. See
// specs/002-pr-preview-verification/data-model.md and contracts/.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { SLUG_PATTERN } from "./branch-slug.mjs";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const ROOT_INDEX_SOURCE = path.join(scriptsDirectory, "pages-root", "index.html");
const DEFAULT_MAX_BYTES = 1_000_000_000;

export const EXIT_MAIN_PROTECTED = 2;
export const EXIT_COLLISION = 3;
export const EXIT_SIZE_LIMIT = 4;

export class PagesTreeError extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

const indexPath = (root) => path.join(root, "subsites.json");
const now = () => new Date().toISOString();

function readIndex(root) {
  return JSON.parse(readFileSync(indexPath(root), "utf8"));
}

function writeIndex(root, index) {
  index.updatedAt = now();
  writeFileSync(indexPath(root), `${JSON.stringify(index, null, 2)}\n`);
}

function directorySize(directory) {
  let total = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const entryPath = path.join(directory, entry.name);
    total += entry.isDirectory()
      ? directorySize(entryPath)
      : statSync(entryPath).size;
  }
  return total;
}

function assertSlug(slug) {
  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid slug "${slug}"`);
  }
}

export function init({ root }) {
  mkdirSync(root, { recursive: true });
  cpSync(ROOT_INDEX_SOURCE, path.join(root, "index.html"));
  writeFileSync(path.join(root, ".nojekyll"), "");
  if (!existsSync(indexPath(root))) {
    writeIndex(root, { updatedAt: now(), subsites: {} });
  }
  return { initialized: true };
}

export function upsert({ root, slug, kind, branch, pr, sha, ciRunUrl, source }) {
  assertSlug(slug);
  if (kind !== "branch" && kind !== "main") {
    throw new Error(`Invalid kind "${kind}"`);
  }
  if ((kind === "main") !== (slug === "main")) {
    throw new Error(`Slug "main" is reserved for kind "main"`);
  }
  if (!/^[0-9a-f]{40}$/.test(sha ?? "")) {
    throw new Error(`Invalid sha "${sha}"`);
  }
  if (!source || !existsSync(source)) {
    throw new Error(`Source directory "${source}" does not exist`);
  }

  const index = readIndex(root);
  const owner = index.subsites[slug];
  if (owner && owner.branch !== branch) {
    throw new PagesTreeError(
      `Address collision with ${owner.branch}; rename the branch`,
      EXIT_COLLISION,
    );
  }

  const manifest = {
    slug,
    kind,
    branch,
    pr: kind === "main" ? null : Number(pr),
    sha,
    ciRunUrl,
    publishedAt: now(),
  };
  if (kind === "branch" && !Number.isInteger(manifest.pr)) {
    throw new Error(`Invalid pull request number "${pr}"`);
  }

  const target = path.join(root, slug);
  const maxBytes = Number(process.env.PAGES_TREE_MAX_BYTES ?? DEFAULT_MAX_BYTES);
  const projectedBytes =
    directorySize(root) -
    (existsSync(target) ? directorySize(target) : 0) +
    directorySize(source);
  if (projectedBytes > maxBytes) {
    throw new PagesTreeError("R&D site would exceed 1 GB", EXIT_SIZE_LIMIT);
  }

  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  writeFileSync(
    path.join(target, "preview.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  index.subsites[slug] = manifest;
  writeIndex(root, index);
  return { upserted: slug, sha };
}

export function remove({ root, slug, sha }) {
  assertSlug(slug);
  if (slug === "main") {
    throw new PagesTreeError("Refusing to remove main", EXIT_MAIN_PROTECTED);
  }

  const target = path.join(root, slug);
  const manifestPath = path.join(target, "preview.json");
  if (sha && existsSync(manifestPath)) {
    const current = JSON.parse(readFileSync(manifestPath, "utf8")).sha;
    if (current !== sha) {
      return { skipped: `subsite shows ${current}` };
    }
  }

  rmSync(target, { recursive: true, force: true });
  const index = readIndex(root);
  const existed = slug in index.subsites;
  delete index.subsites[slug];
  writeIndex(root, index);
  return { removed: slug, existed };
}

export function prune({ root, openBranches }) {
  const open = new Set(openBranches);
  const index = readIndex(root);
  const removed = [];
  for (const [slug, entry] of Object.entries(index.subsites)) {
    if (entry.kind === "branch" && !open.has(entry.branch)) {
      rmSync(path.join(root, slug), { recursive: true, force: true });
      delete index.subsites[slug];
      removed.push(slug);
    }
  }
  writeIndex(root, index);
  return { pruned: removed };
}

function main(argv) {
  const [command, ...rest] = argv;
  const { values } = parseArgs({
    args: rest,
    options: {
      root: { type: "string" },
      slug: { type: "string" },
      kind: { type: "string" },
      branch: { type: "string" },
      pr: { type: "string" },
      sha: { type: "string" },
      "ci-run-url": { type: "string" },
      source: { type: "string" },
      "open-branches": { type: "string" },
    },
  });
  if (!values.root) throw new Error("--root is required");

  switch (command) {
    case "init":
      return init({ root: values.root });
    case "upsert":
      return upsert({
        root: values.root,
        slug: values.slug,
        kind: values.kind,
        branch: values.branch,
        pr: values.pr,
        sha: values.sha,
        ciRunUrl: values["ci-run-url"],
        source: values.source,
      });
    case "remove":
      return remove({ root: values.root, slug: values.slug, sha: values.sha });
    case "prune":
      return prune({
        root: values.root,
        openBranches: JSON.parse(readFileSync(values["open-branches"], "utf8")),
      });
    default:
      throw new Error(`Unknown command "${command}"`);
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    process.stdout.write(`${JSON.stringify(main(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(error instanceof PagesTreeError ? error.exitCode : 1);
  }
}
