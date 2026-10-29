import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function selectIssueRequirements(pages, runNumber) {
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
            (typeof label === "string" ? label : label.name) === "ai-verified",
        ),
    )
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
  const result = selectIssueRequirements(pages, Number(process.argv[3]));
  console.log(JSON.stringify(result));
}
