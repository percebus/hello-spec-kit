import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { githubApi } from "./requirement-github-api.mjs";

export function isCheckDue(issue, events, now = Date.now()) {
  const labels = issue.labels.map((label) =>
    typeof label === "string" ? label : label.name,
  );
  if (labels.includes("ai:verified")) return false;
  if (!labels.includes("ai:checked")) return true;

  const additions = events
    .filter(
      (event) =>
        event.event === "labeled" && event.label?.name === "ai:checked",
    )
    .map((event) => Date.parse(event.created_at));
  if (!additions.length || additions.some((time) => !Number.isFinite(time))) {
    throw new Error(`Cannot establish ai:checked age for issue #${issue.number}`);
  }
  return now - Math.max(...additions) > 7 * 24 * 60 * 60 * 1000;
}

export function selectIssueRequirements(
  pages,
  runNumber,
  getEvents = () => [],
  now = Date.now(),
) {
  if (
    !Array.isArray(pages) ||
    !pages.every(Array.isArray) ||
    !Number.isSafeInteger(runNumber) ||
    runNumber < 1
  ) {
    throw new Error(
      "Expected paginated issue arrays and a positive run number",
    );
  }

  const issues = pages
    .flat()
    .filter(
      (issue) =>
        !issue.pull_request &&
        issue.state === "open" &&
        /^(FR-|SC-)/.test(issue.title) &&
        !issue.labels.some(
          (label) =>
            (typeof label === "string" ? label : label.name) === "ai:verified",
        ),
    )
    .filter((issue) => isCheckDue(issue, getEvents(issue), now))
    .sort((left, right) => left.number - right.number);
  const batchSize = 10;
  const start = issues.length
    ? (((runNumber - 1) % issues.length) * batchSize) % issues.length
    : 0;
  const candidates = Array.from(
    { length: Math.min(batchSize, issues.length) },
    (_, index) => {
      const issue = issues[(start + index) % issues.length];
      return {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        url: issue.html_url,
      };
    },
  );

  return { total: issues.length, candidates };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const pages = JSON.parse(await readFile(process.argv[2], "utf8"));
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error("GITHUB_REPOSITORY is required");
  const result = selectIssueRequirements(
    pages,
    Number(process.argv[3]),
    (issue) =>
      issue.labels.some((label) => label.name === "ai:checked")
        ? githubApi("GET", `repos/${repo}/issues/${issue.number}/events`, undefined, true).flat()
        : [],
  );
  console.log(JSON.stringify(result));
}
