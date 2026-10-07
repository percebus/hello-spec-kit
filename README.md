# podsite

`github` `spec-kit` https://youtube.com/watch?v=a9eR1xsfvHg

## Closed issue auditor

The [agentic Markdown workflow](.github/workflows/issue-closed.md) audits completed
issue closures, traversing only sub-issues bottom-up. It uses Copilot to decide
whether unfinished children can close or their ancestors must reopen, assigns
unassigned issues from linked closed PR authors, and sets `podsite` Status to
`Done`. Not-planned and duplicate closures are excluded. GitHub reads are
read-only; mutations use gh-aw safe outputs.

Configure these Actions secrets:

- `COPILOT_GITHUB_TOKEN`: a fine-grained PAT with **Copilot Requests** permission
  and an active Copilot subscription.
- `ISSUE_AUDITOR_PROJECT_TOKEN`: a token with Projects v2 read/write access and
  Issues read access to this repository (classic PAT: `project`, plus `repo`
  for a private repository).

Replace the project URL placeholders in both the Markdown frontmatter and prompt
with the existing `podsite` project's URL (use `/orgs/` instead of `/users/` for an
organization project). The project needs a single-select `Status` field containing
`Done`. Until configured, the agent is instructed to stop without changes.

Install the [GitHub Agentic Workflows CLI](https://github.com/github/gh-aw),
then run `gh aw compile issue-closed --validate` after editing the Markdown.
Commit both `.md` and the generated `.lock.yml`; do not edit the lockfile manually.
The workflow runs on `issues.closed` and supports manual dispatch with an issue
number. Safe outputs run after the agent finishes, so parents with children still
open are conservatively reopened, even when a child closure has been proposed.
Unassigned closures are likewise reopened while assignment is requested; only
observed assigned closures are eligible for Done. Verify assignments before
closing those issues again, and manually rerun the audit for completed children
once their closures are applied.
