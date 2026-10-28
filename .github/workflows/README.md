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

### CI flow

[always.yml](always.yml) runs, for every branch:

```text
Verify ──▶ Deploy pages ──▶ E2E tests ──▶ Preview verify
```

| Job              | Role                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify`         | Builds and tests locally as before. Builds the subsite with its base path and uploads it as artifact `site`.                                                                                                                                         |
| `deploy-pages`   | Publishes the subsite (or `main/`) into the R&D site; deletes it when the pull request closes; prunes subsites of PRs that are no longer open.                                                                                                       |
| `e2e-tests`      | Runs the existing tests against the deployed subsite (`main` included).                                                                                                                                                                              |
| `preview-verify` | When `PREVIEW_VERIFY=true` and the end-to-end tests pass, dispatches [preview-verify.md](preview-verify.md): a deterministic Playwright scan (`tests/preview/`) decides blocking findings, and the Copilot agent checks intent and posts the report. |

- CI runs one at a time across the repository (`group: ${{ github.workflow }}`,
  `cancel-in-progress: false`, `queue: max`). Waiting runs are queued, never
  dropped. `preview-verify` keeps a per-PR group and can run in parallel.
- A failing subsite stays available until the next push or until the PR
  closes.
- Rerun: **Re-run all jobs** on the PR's CI run, or push a new commit. There is
  no override.
- `deploy-pages` stores the site tree on the `gh-pages` branch as a single
  commit and deploys it with `actions/deploy-pages`. **Never edit `gh-pages`
  by hand.** The Pages source stays "GitHub Actions".
- `preview-verify` reuses `COPILOT_GITHUB_TOKEN`. After editing
  `preview-verify.md`, run `npm run format` first, then
  `gh aw compile preview-verify --validate`, and commit both files.
- Fork pull requests are verified but not deployed. Push the change to a
  branch in this repository to get a subsite.

### Environments

Create these under Settings → Environments:

| Environment    | Deployment branches                                                                  | Variables                                    |
| -------------- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| `main`         | `main`                                                                               | `SUBSITE_KIND=main`, `PREVIEW_VERIFY=false`  |
| `branch`       | No restriction                                                                       | `SUBSITE_KIND=branch`, `PREVIEW_VERIFY=true` |
| `github-pages` | Selected branches and tags: `main` **and** `refs/pull/*/merge` (or "No restriction") | —                                            |

`verify` runs in `main` for `refs/heads/main` and in `branch` otherwise. It
fails with a clear error if `SUBSITE_KIND` is missing.

Environment rules match the run's `GITHUB_REF`. For `pull_request` runs that
is `refs/pull/<n>/merge`, not the branch name. A rule like `feat/*` therefore
never matches, and `github-pages` needs the `refs/pull/*/merge` rule. If the
`branch` environment uses selected branches instead of "No restriction", it
needs the same rule.

### Merge gate

Apply this ruleset once, **after** the feature is on `main` and a pull request
has passed end to end. Before then, nothing can set `preview-verification` to
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

Do not apply force-push or deletion rules to `gh-pages`; `deploy-pages`
force-pushes it on every deployment.

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
