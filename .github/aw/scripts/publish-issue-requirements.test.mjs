import assert from "node:assert/strict";
import test from "node:test";
import { publishIssueRequirements } from "./publish-issue-requirements.mjs";

const original = {
  number: 1,
  title: "FR-001: requirement",
  body: "Acceptance criteria",
  state: "open",
  labels: [],
};
const result = {
  type: "record_requirement_check",
  issue_number: 1,
  original_title: original.title,
  original_body: original.body,
  status: "satisfied",
  comment:
    "GitHub Copilot with actual-model says: GitHub Copilot CLI / GitHub Agentic Workflows; evidence.",
};

function harness(issue = original, events = []) {
  const writes = [];
  return {
    writes,
    api(method, endpoint, data) {
      if (method !== "GET") {
        writes.push({ method, endpoint, data });
        return null;
      }
      if (endpoint.endsWith("/events")) return [events];
      if (endpoint.includes("/labels?")) {
        return [[{ name: "ai:checked" }, { name: "ai:verified" }]];
      }
      return issue;
    },
  };
}

test("satisfied issues receive evidence then both labels", () => {
  const { api, writes } = harness();
  publishIssueRequirements([result], "owner/repo", api);
  assert.deepEqual(writes, [
    {
      method: "POST",
      endpoint: "repos/owner/repo/issues/1/comments",
      data: { body: result.comment },
    },
    {
      method: "POST",
      endpoint: "repos/owner/repo/issues/1/labels",
      data: { labels: ["ai:checked", "ai:verified"] },
    },
  ]);
});

test("stale unsatisfied checks remove then re-add checked without verification", () => {
  const { api, writes } = harness(
    { ...original, labels: [{ name: "ai:checked" }, { name: "other" }] },
    [
      {
        event: "labeled",
        label: { name: "ai:checked" },
        created_at: "2020-01-01T00:00:00Z",
      },
    ],
  );
  publishIssueRequirements(
    [{ ...result, status: "unsatisfied", comment: undefined }],
    "owner/repo",
    api,
  );
  assert.deepEqual(writes, [
    {
      method: "DELETE",
      endpoint: "repos/owner/repo/issues/1/labels/ai%3Achecked",
      data: undefined,
    },
    {
      method: "POST",
      endpoint: "repos/owner/repo/issues/1/labels",
      data: { labels: ["ai:checked"] },
    },
  ]);
});

test("changed, closed, verified, recent, and PR targets produce no writes", () => {
  for (const changes of [
    { title: "FR-001: changed" },
    { body: "changed" },
    { state: "closed" },
    { pull_request: {} },
    { labels: [{ name: "ai:verified" }] },
    { labels: [{ name: "ai:checked" }] },
  ]) {
    const { api, writes } = harness({ ...original, ...changes }, [
      {
        event: "labeled",
        label: { name: "ai:checked" },
        created_at: new Date().toISOString(),
      },
    ]);
    publishIssueRequirements([result], "owner/repo", api);
    assert.deepEqual(writes, []);
  }
});

test("inconclusive, duplicate, excessive, and invalid results fail before writes", () => {
  for (const results of [
    [{ ...result, status: "inconclusive" }],
    [{ ...result, issue_number: -1 }],
    [{ ...result, comment: "Unattributed" }],
    [result, result],
    Array.from({ length: 11 }, (_, i) => ({ ...result, issue_number: i + 1 })),
  ]) {
    const { api, writes } = harness();
    assert.throws(() => publishIssueRequirements(results, "owner/repo", api));
    assert.deepEqual(writes, []);
  }
});

test("comment failures surface and do not mark the issue checked", () => {
  const { api, writes } = harness();
  assert.throws(
    () =>
      publishIssueRequirements(
        [result],
        "owner/repo",
        (method, endpoint, data) => {
          if (endpoint.endsWith("/comments"))
            throw new Error("API unavailable");
          return api(method, endpoint, data);
        },
      ),
    /API unavailable/,
  );
  assert.deepEqual(writes, []);
});

test("first unsatisfied check adds only checked and creates a missing label", () => {
  const { api, writes } = harness();
  publishIssueRequirements(
    [{ ...result, status: "unsatisfied", comment: undefined }],
    "owner/repo",
    (method, endpoint, data) =>
      method === "GET" && endpoint.includes("/labels?")
        ? [[]]
        : api(method, endpoint, data),
  );
  assert.deepEqual(writes, [
    {
      method: "POST",
      endpoint: "repos/owner/repo/labels",
      data: { name: "ai:checked", color: "1D76DB" },
    },
    {
      method: "POST",
      endpoint: "repos/owner/repo/issues/1/labels",
      data: { labels: ["ai:checked"] },
    },
  ]);
});

test("failed refresh addition propagates so a removed checked label is retryable", () => {
  const { api, writes } = harness(
    { ...original, labels: [{ name: "ai:checked" }] },
    [
      {
        event: "labeled",
        label: { name: "ai:checked" },
        created_at: "2020-01-01T00:00:00Z",
      },
    ],
  );
  assert.throws(
    () =>
      publishIssueRequirements(
        [{ ...result, status: "unsatisfied", comment: undefined }],
        "owner/repo",
        (method, endpoint, data) => {
          if (method === "POST" && endpoint.endsWith("/labels")) {
            throw new Error("Label addition failed");
          }
          return api(method, endpoint, data);
        },
      ),
    /Label addition failed/,
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0].method, "DELETE");
});
