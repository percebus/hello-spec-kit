import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const script = path.resolve("scripts/pages-tree.mjs");
const shaA = "a".repeat(40);
const shaB = "b".repeat(40);
const ciRunUrl = "https://github.com/percebus/hello-spec-kit/actions/runs/1";

let workspace: string;
let root: string;
let source: string;

function run(args: string[], env: Record<string, string> = {}) {
  const result = spawnSync(
    process.execPath,
    [script, ...args, "--root", root],
    {
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );
  return {
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function upsert(
  slug: string,
  branch: string,
  sha = shaA,
  extra: string[] = [],
) {
  const kind = slug === "main" ? "main" : "branch";
  return run([
    "upsert",
    "--slug",
    slug,
    "--kind",
    kind,
    "--branch",
    branch,
    "--pr",
    "12",
    "--sha",
    sha,
    "--ci-run-url",
    ciRunUrl,
    "--source",
    source,
    ...extra,
  ]);
}

const readIndex = () =>
  JSON.parse(readFileSync(path.join(root, "subsites.json"), "utf8"));

test.beforeEach(() => {
  workspace = mkdtempSync(path.join(tmpdir(), "pages-tree-"));
  root = path.join(workspace, "tree");
  source = path.join(workspace, "site");
  mkdirSync(source);
  writeFileSync(path.join(source, "index.html"), "<p>site</p>");
  expect(run(["init"]).status).toBe(0);
});

test.afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

test("init is idempotent and lays out the root", () => {
  expect(upsert("feat-a", "feat/a").status).toBe(0);
  expect(run(["init"]).status).toBe(0);

  expect(existsSync(path.join(root, "index.html"))).toBe(true);
  expect(existsSync(path.join(root, ".nojekyll"))).toBe(true);
  expect(Object.keys(readIndex().subsites)).toEqual(["feat-a"]);
});

test("upsert writes the subsite, its manifest, and the index entry", () => {
  expect(upsert("feat-a", "feat/a").status).toBe(0);

  const manifest = JSON.parse(
    readFileSync(path.join(root, "feat-a", "preview.json"), "utf8"),
  );
  expect(manifest).toMatchObject({
    slug: "feat-a",
    kind: "branch",
    branch: "feat/a",
    pr: 12,
    sha: shaA,
    ciRunUrl,
  });
  expect(existsSync(path.join(root, "feat-a", "index.html"))).toBe(true);
  expect(readIndex().subsites["feat-a"]).toEqual(manifest);
});

test("main is published with a null pull request", () => {
  expect(upsert("main", "main").status).toBe(0);
  expect(readIndex().subsites.main).toMatchObject({ kind: "main", pr: null });
});

test("a different branch with the same slug is rejected", () => {
  expect(upsert("feat-a-b-c", "feat/a-b/c").status).toBe(0);

  const collision = upsert("feat-a-b-c", "feat/a/b-c", shaB);
  expect(collision.status).toBe(3);
  expect(collision.stderr).toContain("Address collision with feat/a-b/c");
  expect(readIndex().subsites["feat-a-b-c"].sha).toBe(shaA);
});

test("remove with a different sha is skipped", () => {
  upsert("feat-a", "feat/a", shaB);

  const result = run(["remove", "--slug", "feat-a", "--sha", shaA]);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("skipped");
  expect(existsSync(path.join(root, "feat-a"))).toBe(true);
});

test("remove with the matching sha deletes the subsite", () => {
  upsert("feat-a", "feat/a", shaA);

  expect(run(["remove", "--slug", "feat-a", "--sha", shaA]).status).toBe(0);
  expect(existsSync(path.join(root, "feat-a"))).toBe(false);
  expect(readIndex().subsites).toEqual({});
});

test("main can never be removed", () => {
  upsert("main", "main");
  expect(run(["remove", "--slug", "main"]).status).toBe(2);
  expect(existsSync(path.join(root, "main"))).toBe(true);
});

test("prune keeps main and open branches", () => {
  upsert("main", "main");
  upsert("feat-a", "feat/a");
  upsert("feat-b", "feat/b");
  const openBranches = path.join(workspace, "open.json");
  writeFileSync(openBranches, JSON.stringify(["feat/a"]));

  expect(run(["prune", "--open-branches", openBranches]).status).toBe(0);
  expect(Object.keys(readIndex().subsites).sort()).toEqual(["feat-a", "main"]);
  expect(existsSync(path.join(root, "feat-b"))).toBe(false);
});

test("exceeding the size cap fails without touching the tree", () => {
  upsert("feat-a", "feat/a");
  writeFileSync(path.join(source, "big.bin"), Buffer.alloc(2000));

  const result = upsert("feat-a", "feat/a", shaB);
  expect(result.status).toBe(0);

  const capped = run(
    [
      "upsert",
      "--slug",
      "feat-c",
      "--kind",
      "branch",
      "--branch",
      "feat/c",
      "--pr",
      "13",
      "--sha",
      shaA,
      "--ci-run-url",
      ciRunUrl,
      "--source",
      source,
    ],
    { PAGES_TREE_MAX_BYTES: "1000" },
  );
  expect(capped.status).toBe(4);
  expect(capped.stderr).toContain("R&D site would exceed 1 GB");
  expect(existsSync(path.join(root, "feat-c"))).toBe(false);
  expect(readIndex().subsites["feat-a"].sha).toBe(shaB);
});
