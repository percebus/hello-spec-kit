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

[always.yml](always.yml) runs:

```text
pull request: Verify ──▶ Deploy pages ──▶ E2E tests   (merge gate)
main:         Verify ──▶ Deploy pages ──▶ E2E tests   ──(CI succeeded)──▶ preview-verify.md (post-merge review)
```

| Job            | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `verify`       | Isolated build and tests, as before. No environment, no status, and nothing published.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `deploy-pages` | Skips forks. Computes the slug, builds the subsite (or `main/`) with its base path, uploads artifact `site`, publishes it into the R&D site, and prunes subsites of PRs that are no longer open.                                                                                                                                                                                                                                                                                           |
| `e2e-tests`    | Runs the existing tests against the deployed subsite (`main` included). For pull requests, sets `preview-verification` to `success` or `failure`, which is the merge gate.                                                                                                                                                                                                                                                                                                                 |
| (separate)     | [preview-verify.md](preview-verify.md) runs on `workflow_run` when CI succeeds on a push to `main`, so `main/` is published and has passed its end-to-end tests. It finds the merged pull request; then a deterministic Playwright scan (`tests/preview/`) and the Copilot agent check `main/` against the merged stories. The report is posted on the PR and on every issue it closes, and those issues are reopened when the stories are not done (blocking finding or intent mismatch). |

- CI concurrency is per ref (`group: ${{ github.ref }}-${{ github.workflow }}`,
  `cancel-in-progress: true`): a newer push cancels the older run, and
  different branches run in parallel. Only `deploy-pages` is serialized,
  through the job-level group `pages` (`queue: max`).
- `main` versus branch behavior comes from the workflow-level
  `env.KIND: ${{ github.ref_name == 'main' && 'main' || 'branch' }}`.
- `verify` uses `.env.local` to test the build served by its local web server.
  `e2e-tests` selects `.env.branch` for PR branches and `.env.main` after merge;
  the workflow replaces `{branch}` in the branch base path with the deployed
  slug. `.env.development` and `.env.production` remain separate deployment
  profiles.
- When a pull request closes or merges,
  [pull_request_closed.yml](pull_request_closed.yml) deletes its subsite. It
  runs on `pull_request_target`, so it uses the default branch's workflow and
  never checks out PR code. It starts as soon as the pull request closes and
  waits only for an in-flight `deploy-pages`, through the shared job-level
  group `pages`. It only takes effect once it is on `main`.
- Both workflows share the composite action [replace-pages-artifact](../actions/replace-pages-artifact/action.yml)
  for publish/delete, prune, deploy, and the PR comment.
- A failing subsite stays available until the next push or until the PR
  closes.
- Rerun: **Re-run all jobs** on the PR's CI run, or push a new commit. To
  rerun a post-merge review, re-run the `main` CI run for that commit. There
  is no override.
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

| Environment    | Deployment branches                                                                  |
| -------------- | ------------------------------------------------------------------------------------ |
| `github-pages` | Selected branches and tags: `main` **and** `refs/pull/*/merge` (or "No restriction") |

The `main` and `branch` environments from earlier versions are no longer used
and can be deleted.

**Bootstrap:** each deployment publishes the whole stored tree, and the root
redirects to `main/`. Until the first push to `main` runs this workflow, `main/`
does not exist and the root returns a 404, even though branch subsites work.
Merging the pull request that introduces this workflow publishes `main/`.

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

## Open requirement verification

[issue-requirement-verify.md](issue-requirement-verify.md) runs daily and supports
manual dispatch. It scans every page of open issues, selects literal `FR-` or
`SC-` title prefixes, and skips issues with the exact `ai:verified` label.
An issue is eligible when `ai:checked` is absent or its latest GitHub `labeled`
event is strictly older than seven days. Issue-event reads are paginated;
issue modification time is not a substitute for label age. Missing event
history fails explicitly rather than guessing. There are no dated labels.

Each run selects at most ten issues in issue-number order, rotating the starting
offset with the workflow run number. This bounds cost without letting repeatedly
unsatisfied issues permanently block the rest of a stable queue. Every candidate
gets a fresh, sequential sub-agent and an isolated named Playwright browser
session against `https://percebus.github.io/hello-spec-kit/main/`.

Only requirements fully demonstrated in the deployed UI receive `ai:verified`
and an evidence comment identifying the actual worker model, exposed reasoning
effort, Copilot CLI version, gh-aw harness version, UTC time, and Actions run.
The existing `COPILOT_GITHUB_TOKEN` secret authenticates Copilot. Workers inherit
the configured Copilot model; they must not invent attribution when runtime
metadata is unavailable. Every conclusive check adds `ai:checked`, removing and
re-adding it when stale so GitHub records the new check time. Unsatisfied issues
become eligible again after one week; ambiguous or failed checks do not refresh
the marker and remain retryable. Diagnostics go in the run summary. No issues
close. Verified issues are skipped permanently until `ai:verified` is removed
(and any recent `ai:checked` ages out or is removed).

GitHub reads are read-only and writes use an isolated custom gh-aw safe-output
job. It creates missing labels, rechecks eligibility and unchanged requirements,
and deterministically performs comment, label removal, then label addition.
This avoids ordering ambiguity between separate deferred label handlers.
These API calls are not an atomic transaction; inspect the safe-output job if
any fail. Errors fail the job rather than silently marking verification complete.

Workflow-only helpers and their tests live in [../aw/scripts/](../aw/scripts/).
After editing, run `node --test .github/aw/scripts/*issue-requirements.test.mjs`,
`npm run format`, then `gh aw compile issue-requirement-verify --validate`.
Commit the Markdown and generated lockfile together; do not edit the lockfile.

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
