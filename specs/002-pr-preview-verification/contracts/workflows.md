# Contract: Workflow interfaces

Three workflows and one shared action own the R&D site and the merge gate:

| Workflow / action                    | Writes                                                                          | Runs PR code?                               |
| ------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------- |
| `always.yml` (CI)                    | `site` artifact, `gh-pages` storage branch, Pages deployment, PR comment, statuses | Yes, for same-repo PRs (see research R2)   |
| `pull_request_closed.yml`            | `gh-pages` storage branch, Pages deployment, PR comment                         | No (`pull_request_target`, default branch)  |
| `preview-verify.md` (gh-aw)          | statuses, PR report comment, evidence artifacts                                 | No (browses the published subsite only)     |
| `.github/actions/replace-pages-artifact` (composite) | Shared publish/delete steps used by both writers above                        | n/a                                         |

## `.github/actions/replace-pages-artifact` (composite action)

The helpers it runs (ranch-slug.mjs, pages-tree.mjs, oot/index.html) stay in .github/pages/; the caller must check out the repository first.

Inputs: `op` (`publish`\|`delete`), `slug` (computed from `branch` for a
delete when empty), `kind`, `branch`, `pr`, `sha`, `source` (publish only),
`run-url`, `github-token`. Outputs: `slug`, `changed`, `page_url`.

Steps:

1. Fetch `gh-pages` and run `pages-tree.mjs`: `init`, then `upsert` (publish)
   or `remove` (delete), then `prune` against open PR branches.
2. If the tree changed, force-push a single orphan commit, then run
   `upload-pages-artifact`, `configure-pages`, and `deploy-pages`.
3. Create or update the `<!-- rnd-subsite -->` PR comment.

For a branch publish, it sets `pending` "Publishing subsite…", and on collision
or size errors it sets `error` with the reason. The caller must run in the
`github-pages` environment with `contents: write`, `pages: write`, and
`id-token: write`.

## `always.yml`

**Triggers**: `pull_request` (`opened`, `synchronize`, `reopened`), `push` to
`main`, and `workflow_dispatch`.

**Concurrency**: `group: ${{ github.ref }}-${{ github.workflow }}` with
`cancel-in-progress: true`, so a newer push to the same ref cancels the older
run, and different refs run in parallel. Only `deploy-pages` is serialized,
through the job-level group `pages` (`cancel-in-progress: false`,
`queue: max`), which it shares with `pull_request_closed.yml` ›
`delete-subsite`.

**Kind**: the workflow-level `env.KIND` is
`${{ github.ref_name == 'main' && 'main' || 'branch' }}`. No `main` or
`branch` environment is used. `deploy-pages` runs in `github-pages`.

```text
Verify ──▶ Deploy pages ──▶ E2E tests
```

When this workflow succeeds on a push to `main`, `preview-verify` starts on
`workflow_run`.

| Job              | Runs when                                                                                     | Does                                                                                                                                                                                                                                                                                         | Permissions                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `verify`         | Always                                                                                         | Isolated build and `npm test` using `ENV=local`; tests the export served locally. It publishes nothing and writes no status; a failing `Verify` check blocks the merge by itself. | `contents: read`, `actions: read`, `checks: write`, `pull-requests: write` |
| `deploy-pages`   | `verify` succeeded, and the ref is `main` or a same-repo PR (forks are skipped)                | `kind=main`: slug `main`. `kind=branch`: computes the slug (an invalid branch name sets `error`; rename the branch) and sets `pending` "Building subsite…". With a slug, it loads the base path from `.env.main` or `.env.branch` (resolving `{branch}` to the slug), runs `npm install`, uploads artifact `site`, and runs the `replace-pages-artifact` action with `op: publish` and `source: out`. On failure, any status other than `error` becomes `error` "Inconclusive: building or publishing the subsite failed". Outputs `slug`; the environment URL is `<page_url><slug>/`. | `contents: write`, `pages: write`, `id-token: write`, `pull-requests: write`, `statuses: write`; environment `github-pages` |
| `e2e-tests`      | `deploy-pages` succeeded with a `slug` output                                                  | Polls `<slug>/preview.json` until `sha` matches (≤ 5 min). Selects `.env.branch` for PRs and `.env.main` after merge, resolves the branch slug, and runs `npm run test:e2e` with the corresponding `ENV`. For `kind=branch`, it sets `pending` "Running end-to-end tests…", then `success` "Subsite passed end-to-end tests" or `failure` "End-to-end tests failed on the subsite", which is the merge gate. Publishes JUnit results. | `contents: read`, `actions: read`, `checks: write`, `pull-requests: write`, `statuses: write` |

Reruns use GitHub's "Re-run all jobs" on the PR's CI run (FR-019).

## `pull_request_closed.yml`

**Trigger**: `pull_request_target` (`closed`) into `main`. The workflow file
comes from the default branch, and `GITHUB_REF=refs/heads/main`, so it can
deploy to `github-pages`. It also runs for pull requests with merge conflicts,
which `pull_request` would skip.

**Concurrency**: none at the workflow level, so the workflow starts as soon as
the pull request closes, without waiting for CI. Only `delete-subsite` is
serialized, through the job-level group `pages` (`cancel-in-progress: false`,
`queue: max`) shared with `always.yml` › `deploy-pages`. Both rewrite the
`gh-pages` tree and redeploy the whole site, so they must not overlap.

| Job              | Runs when                         | Does                                                                                                   | Permissions                                                                     |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `delete-subsite` | Same-repo PR (not a fork)         | Checks out the default branch, never PR code, and runs the `replace-pages-artifact` action with `op: delete` and `branch: <head ref>`. | `contents: write`, `pages: write`, `id-token: write`, `pull-requests: write`; environment `github-pages` |

Because `pull_request_target` reads the workflow from the default branch, this
workflow only takes effect once it is on `main`. Until then, each deployment's
prune step removes subsites of closed pull requests.

## `preview-verify` (gh-aw: `.github/workflows/preview-verify.md` → `.lock.yml`)

| Trigger             | Inputs                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| `workflow_run` of `\[C\]ontinuous \[I\]ntegration` (brackets escaped: workflow names are filter patterns), `types: [completed]`, `branches: [main]` | None. Uses `github.event.workflow_run.head_sha`. Runs only when `conclusion == 'success'` and `event == 'push'`. gh-aw adds same-repository and no-fork checks. |

It runs **after a merge**, against `main/`. Re-running `main`'s CI run re-runs
it. The `workflows:` entry must match `always.yml`'s `name:` literally. Workflow name filters treat `[...]` as a character class, so the brackets are escaped.

**Concurrency**: `group: preview-verify-${{ github.event.workflow_run.head_sha }}`,
`cancel-in-progress: true`, and `job-discriminator: ${{ github.event.workflow_run.head_sha }}`.
Reviews of different merged PRs can run in parallel.

| Job              | Purpose                                                                                                         | Permissions / secrets                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `resolve`        | Finds the merged PR for `head_sha` (`GET /commits/{sha}/pulls`) and stops if there is none (a direct push). Otherwise it outputs `pr` and sets `pending` "Scanning…" on the `main` commit. It then collects `context.json` (PR title, body, files, and `closingIssuesReferences`, keeping linked-issue bodies only from `OWNER`/`MEMBER`/`COLLABORATOR` authors) into artifact `preview-context-<sha>`. | `pull-requests: read`, `statuses: write`  |
| `scan`           | Runs `npx playwright test --project=preview-scan` with `PREVIEW_SCAN=1`, `BASE_URL=https://percebus.github.io`, and `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/<slug>`. Leaves `PREVIEW_REF` unset, so the banner check skips on `main/`. Checks `preview.json.sha` before and after the scan; a mismatch means `superseded` ("main moved on"). Uploads `preview-scan-<sha>`. Sets `failure` on blocking findings, otherwise `pending` "Reviewing…". | `contents: read`, `statuses: write`       |
| `agent`          | Runs the Copilot agent with `playwright-cli` against `/hello-spec-kit/<slug>/` only. It decides done / not done / inconclusive (FR-021). | gh-aw managed; `COPILOT_GITHUB_TOKEN`     |
| `safe_outputs`   | Processes `add-comment` (`max: 6`: the report on the PR and each closing issue), `update-issue` (`status`, `max: 5`: reopen closing issues when not done), and `upload-artifact` (`/tmp/gh-aw/preview/*.png`). | gh-aw managed                             |
| `record_verdict` | Custom safe-output job that receives `{ outcome: complete \| inconclusive, reason, advisory_count }`. Changes the status only from `pending`. | `statuses: write`                         |
| `finalize`       | Runs with `if: always()`. Changes a status still `pending` after 60 s to `error`.                               | `statuses: write`                         |

**Agent tools**: `playwright-cli:*`, `jq`, `cat`, and `ls`; GitHub tool
`pull_request_read` only. The sandbox has no GitHub token, and gh-aw's integrity
filter (`min-integrity: approved` on public repositories) hides content from
untrusted authors, so the agent reads `context.json` instead of looking things
up;
`network.allowed: [defaults, playwright, "percebus.github.io"]`.

## Build-time environment

| Variable                  | Branch subsite              | `main`                  |
| ------------------------- | --------------------------- | ----------------------- |
| `NEXT_PUBLIC_BASE_PATH`   | `/hello-spec-kit/<slug>`    | `/hello-spec-kit/main`  |
| `NEXT_PUBLIC_PREVIEW_PR`  | PR number                   | unset                   |
| `NEXT_PUBLIC_PREVIEW_REF` | head branch                 | unset                   |
| `NEXT_PUBLIC_PREVIEW_SHA` | head SHA                    | unset                   |

The environment profiles have distinct responsibilities:

- `.env.local` configures local development and the local test server.
- `.env.branch` and `.env.main` configure E2E tests against their deployed sites.
- `.env.development` and `.env.production` are separate deployment profiles.
- The scanner runs with `PREVIEW_SCAN=1`, skips dotenv, and reads `BASE_URL`
  and `NEXT_PUBLIC_BASE_PATH` from the process environment.

## Repository configuration (one-time, manual)

| Item                          | Value                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Pages source                  | Stays **GitHub Actions**                                                                |

| Environment `github-pages`    | Selected branches and tags: `main` and `refs/pull/*/merge`, because `pull_request` runs deploy as `GITHUB_REF=refs/pull/<n>/merge`. "No restriction" also works. |
| `gh-pages` branch             | Created by the first deployment. Exclude it from rules that block force-pushes.         |
| Secret `COPILOT_GITHUB_TOKEN` | Existing (see `.github/workflows/README.md`)                                            |
| Ruleset on `main`             | Require status checks `Verify` and `preview-verification`; require a PR                 |
| Follow-up                     | #100: move production to `hello-spec-kit-release`                                       |
