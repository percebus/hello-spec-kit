import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { githubApi } from "./requirement-github-api.mjs";
import { isCheckDue } from "./select-issue-requirements.mjs";

export function publishIssueRequirements(items, repo, api = githubApi) {
  const results = items.filter((item) => item.type === "record_requirement_check");
  if (
    results.length > 10 ||
    new Set(results.map((item) => item.issue_number)).size !== results.length
  ) {
    throw new Error("Expected at most ten distinct issue results");
  }
  for (const result of results) {
    if (
      !Number.isSafeInteger(result.issue_number) ||
      result.issue_number < 1 ||
      !["satisfied", "unsatisfied"].includes(result.status) ||
      typeof result.original_title !== "string" ||
      typeof result.original_body !== "string" ||
      (result.status === "satisfied" &&
        (typeof result.comment !== "string" ||
          !result.comment.startsWith("GitHub Copilot with ") ||
          !result.comment.includes("GitHub Agentic Workflows") ||
          !result.comment.includes("GitHub Copilot CLI")))
    ) {
      throw new Error("Invalid conclusive requirement result");
    }
  }

  for (const result of results) {
    const endpoint = `repos/${repo}/issues/${result.issue_number}`;
    const issue = api("GET", endpoint);
    if (
      issue.pull_request ||
      issue.state !== "open" ||
      !/^(FR-|SC-)/.test(issue.title) ||
      issue.title !== result.original_title ||
      (issue.body ?? "") !== result.original_body
    ) {
      console.log(`Skipping changed/ineligible issue #${result.issue_number}`);
      continue;
    }
    const events = api("GET", `${endpoint}/events`, undefined, true).flat();
    if (!isCheckDue(issue, events)) {
      console.log(`Skipping verified/recently checked issue #${issue.number}`);
      continue;
    }

    // Publish evidence before marking a check complete so failures stay retryable.
    if (result.status === "satisfied") {
      api("POST", `${endpoint}/comments`, { body: result.comment });
    }
    for (const name of ["ai:checked", ...(result.status === "satisfied" ? ["ai:verified"] : [])]) {
      const existing = api("GET", `repos/${repo}/labels?per_page=100`, undefined, true)
        .flat()
        .some((label) => label.name === name);
      if (!existing) {
        api("POST", `repos/${repo}/labels`, {
          name,
          color: name === "ai:verified" ? "0E8A16" : "1D76DB",
        });
      }
    }
    if (issue.labels.some((label) => label.name === "ai:checked")) {
      api("DELETE", `${endpoint}/labels/${encodeURIComponent("ai:checked")}`);
    }
    api("POST", `${endpoint}/labels`, {
      labels: [
        "ai:checked",
        ...(result.status === "satisfied" ? ["ai:verified"] : []),
      ],
    });
    console.log(`Recorded ${result.status} check for issue #${issue.number}`);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const output = JSON.parse(
    await readFile(process.env.GH_AW_AGENT_OUTPUT, "utf8"),
  );
  if (!process.env.GITHUB_REPOSITORY) {
    throw new Error("GITHUB_REPOSITORY is required");
  }
  publishIssueRequirements(output.items, process.env.GITHUB_REPOSITORY);
}
