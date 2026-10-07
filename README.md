# podsite

`github` `spec-kit` https://youtube.com/watch?v=a9eR1xsfvHg

## Closed issue auditor

`.github/workflows/issue-closed.yml` audits completed closures and can be rerun
manually with an issue number. Not-planned and duplicate closures are skipped.
Only sub-issues are followed, bottom-up; parent and related links are ignored.
An open child is closed only when a merged closing PR exists and Copilot finds
evidence that all requirements are met. Otherwise, closed ancestors are reopened.
Cross-repository children are checked but never modified.

Existing assignees are preserved. Unassigned issues use a linked closed PR's
author (merged PRs first), falling back to the workflow actor. If nobody can be
assigned, the issue is reopened and the audit fails. Completed issues are added
to the `podsite` project and its `Status` is set to `Done`.

Configure these Actions secrets before enabling the workflow:

- `COPILOT_GITHUB_TOKEN`: a fine-grained PAT with **Copilot Requests** permission
  and an active Copilot subscription.
- `ISSUE_AUDITOR_PROJECT_TOKEN`: a token with read/write access to the owner's
  Projects v2 and read access to this repository. A classic PAT needs `project`
  (and `repo` for a private repository); a fine-grained PAT needs Projects
  read/write and repository Issues read access.

Optionally set the Actions variable `PODSITE_PROJECT_OWNER` if the project belongs
to a different user or organization. That owner must have exactly one project
named `podsite`, with a single-select `Status` field containing `Done`.
Project permission or configuration errors fail the run rather than silently
skipping updates. Copilot receives only bounded issue/PR/comment evidence, has
no tools, and is not given the issue or project mutation tokens.

Run the auditor's mocked regression tests with
`node --test scripts/audit-closed-issue.test.mjs`. No live issues are changed by
these tests.
