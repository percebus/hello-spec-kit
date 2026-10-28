# Workflows

## R&D site and pull request subsites

`hello-spec-kit`'s GitHub Pages site is the R&D site. Every open same-repo pull
request into `main` gets its own subsite, and `main` lives at its own subsite.
See `specs/002-pr-preview-verification/` and
[ADR-002](../../docs/ADR/002-rnd-site-subsites.md).

```text
https://percebus.github.io/hello-spec-kit/
├── index.html        → redirects to ./main/
├── main/             → main (interim production; see #100)
├── <branch-slug>/    → one subsite per open PR branch
└── subsites.json     → slug → branch, PR, SHA
```

A branch name becomes a flat slug: `feat/a/b/c` → `feat-a-b-c`. Names longer
than 63 characters keep 54 characters plus an 8-character hash. Two open
branches that flatten to the same slug (for example `feat/a-b/c` and
`feat/a/b-c`) are rejected; rename the second branch.

### Workflows

| Workflow                                     | Role                                                                                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [always.yml](always.yml)                     | Builds and tests as before, then builds the subsite with its base path and uploads it as artifact `site`. Sets `preview-verification` to "Waiting for subsite".                                   |
| [pages-publish.yml](pages-publish.yml)       | The only writer of the R&D site. Publishes after CI succeeds, deletes subsites when a PR closes or fails verification, and prunes hourly. Runs `main`'s end-to-end tests after publishing `main`. |
| [preview-verify.md](preview-verify.md)       | Agentic workflow, compiled to `preview-verify.lock.yml`. A deterministic Playwright scan (`tests/preview/`) decides blocking findings; the Copilot agent checks intent and posts the report.      |
| [preview-override.yml](preview-override.yml) | Maintainer-only override of the merge gate, with a required reason.                                                                                                                               |

- `pages-publish` stores the site tree on the `gh-pages` branch as a single
  commit and deploys it with `actions/deploy-pages`. **Never edit `gh-pages`
  by hand.** The Pages source stays "GitHub Actions".
- `workflow_run`, `pull_request_target`, `schedule`, and
  `gh workflow run --ref main` use the workflow files on `main`. Changes to
  these workflows only take effect after they merge; validate them with a
  follow-up throwaway pull request.
- `preview-verify` reuses `COPILOT_GITHUB_TOKEN`. After editing
  `preview-verify.md`, run `gh aw compile preview-verify --validate` and commit
  both files.
- Fork pull requests are not published automatically. Review the code first,
  then dispatch a publish for them.

### Rerun and override

```text
gh workflow run pages-publish.yml    -f op=publish -f pr_number=<N>
gh workflow run preview-override.yml -f pr_number=<N> -f reason="<why>"
```

A rerun republishes the pull request's latest successful CI artifact, which
recreates a deleted subsite, and verifies it again. An override requires
`admin` or `maintain` permission and is recorded on the pull request.

### Merge gate

Apply this ruleset once, **after** `pages-publish.yml` and `preview-verify`
are on `main`. Before then, nothing can set `preview-verification` to
`success`, and every pull request would be blocked.

```text
gh api -X POST repos/percebus/hello-spec-kit/rulesets --input - <<'EOF'
{
  "name": "main: preview verification",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "Verify" },
          { "context": "preview-verification" } ] } }
  ]
}
EOF
```

Do not apply force-push or deletion rules to `gh-pages`; `pages-publish`
force-pushes it on every publish.

## Closed issue auditor

The [agentic Markdown workflow](issue-closed.md) audits completed
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
then run `gh aw compile issue-closed --validate` from the repository root after
editing the Markdown.
Commit both `.md` and the generated `.lock.yml`; do not edit the lockfile manually.
The workflow runs on `issues.closed` and supports manual dispatch with an issue
number. Safe outputs run after the agent finishes, so parents with children still
open are conservatively reopened, even when a child closure has been proposed.
Unassigned closures are likewise reopened while assignment is requested; only
observed assigned closures are eligible for Done. Verify assignments before
closing those issues again, and manually rerun the audit for completed children
once their closures are applied.

### Lockfile tooling

`issue-closed.lock.yml` is the runnable GitHub Actions workflow generated from
`issue-closed.md` by `gh aw compile`.
[gh-actions-lock](https://github.com/github/gh-actions-lock) is a separate,
technical-preview tool for pinning workflow dependencies in
`.github/workflows/actions.lock`. It does not replace the agentic workflow
compiler or its generated YAML. This repository does not currently use it.
