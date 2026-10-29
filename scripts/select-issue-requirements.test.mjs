import assert from "node:assert/strict";
import test from "node:test";
import {
  isCheckDue,
  selectIssueRequirements,
} from "./select-issue-requirements.mjs";

function issue(number, overrides = {}) {
  return {
    number,
    title: `FR-${number}: requirement`,
    body: "The deployed application must meet this requirement.",
    html_url: `https://github.com/percebus/hello-spec-kit/issues/${number}`,
    state: "open",
    labels: [],
    ...overrides,
  };
}

test("selects only literal title prefixes across every API page", () => {
  const result = selectIssueRequirements(
    [
      [issue(1), issue(2, { title: "SC-002: criterion" })],
      [
        issue(3, { title: "[FR-003] not a prefix" }),
        issue(4, { title: "fr-004: lowercase" }),
        issue(5, { title: " FR-005: leading space" }),
        issue(6, { title: "Other SC-006" }),
        issue(7, { pull_request: { url: "pulls/7" } }),
        issue(8, { state: "closed" }),
      ],
      [issue(9)],
    ],
    1,
  );
  assert.equal(result.total, 3);
  assert.deepEqual(
    result.candidates.map(({ number }) => number),
    [1, 2, 9],
  );
  assert.deepEqual(result.candidates[0], {
    number: 1,
    title: "FR-1: requirement",
    body: "The deployed application must meet this requirement.",
    url: "https://github.com/percebus/hello-spec-kit/issues/1",
  });
});

test("only the exact ai:verified label excludes an issue, regardless of age", () => {
  const result = selectIssueRequirements(
    [
      [
        issue(1, { labels: [{ name: "ai:verified" }] }),
        issue(2, { labels: ["ai:verified"] }),
        issue(3, { labels: [{ name: "ai-verified:20261029" }] }),
        issue(4, { labels: [{ name: "ai-checked:20261029T191435Z" }] }),
        issue(5, { labels: [{ name: "unrelated" }] }),
      ],
    ],
    1,
  );
  assert.deepEqual(
    result.candidates.map(({ number }) => number),
    [3, 4, 5],
  );
});

test("checked label uses its latest addition, not issue updated_at", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  const checked = issue(1, {
    labels: [{ name: "ai:checked" }],
    updated_at: "2026-10-29T11:59:59Z",
  });
  const event = (created_at, overrides = {}) => ({
    event: "labeled",
    label: { name: "ai:checked" },
    created_at,
    ...overrides,
  });
  assert.equal(isCheckDue(checked, [event("2026-10-22T11:59:59Z")], now), true);
  assert.equal(
    isCheckDue(checked, [event("2026-10-22T12:00:00Z")], now),
    false,
  );
  assert.equal(
    isCheckDue(
      checked,
      [
        event("2026-10-01T12:00:00Z"),
        event("2026-10-28T12:00:00Z"),
        event("2026-10-29T12:00:00Z", { event: "unlabeled" }),
      ],
      now,
    ),
    false,
  );
  assert.throws(() => isCheckDue(checked, [], now), /Cannot establish/);
  assert.throws(
    () => isCheckDue(checked, [event("invalid")], now),
    /Cannot establish/,
  );
});

test("selection fetches check age and excludes recently checked issues", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  const result = selectIssueRequirements(
    [[issue(1, { labels: ["ai:checked"] }), issue(2)]],
    1,
    () => [
      {
        event: "labeled",
        label: { name: "ai:checked" },
        created_at: "2026-10-28T12:00:00Z",
      },
    ],
    now,
  );
  assert.deepEqual(
    result.candidates.map(({ number }) => number),
    [2],
  );
});

test("rotates bounded batches without starving unsatisfied issues", () => {
  const pages = [Array.from({ length: 25 }, (_, index) => issue(index + 1))];
  const batches = [1, 2, 3].map((run) =>
    selectIssueRequirements(pages, run).candidates.map(({ number }) => number),
  );
  assert.deepEqual(batches[0], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(batches[1], [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.deepEqual(batches[2], [21, 22, 23, 24, 25, 1, 2, 3, 4, 5]);
  assert.equal(new Set(batches.flat()).size, 25);
  assert.equal(new Set(batches[2]).size, 10);
});

test("handles empty queues and small queues without duplicate workers", () => {
  assert.deepEqual(selectIssueRequirements([[]], 1), {
    total: 0,
    candidates: [],
  });
  const result = selectIssueRequirements([[issue(2), issue(1)]], 100);
  assert.equal(result.total, 2);
  assert.deepEqual(
    result.candidates.map(({ number }) => number),
    [1, 2],
  );
});

test("rejects malformed pages and invalid run numbers explicitly", () => {
  for (const pages of [null, {}, [issue(1)]]) {
    assert.throws(() => selectIssueRequirements(pages, 1));
  }
  for (const run of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => selectIssueRequirements([[]], run));
  }
});
