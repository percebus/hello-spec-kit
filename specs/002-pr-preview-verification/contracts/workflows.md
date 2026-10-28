# Contract: Workflow interfaces

Two workflows own the R&D site and the merge gate:

| Workflow                    | Writes                                                                          | Runs PR code?                               |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| `always.yml` (CI)           | `site` artifact, `gh-pages` storage branch, Pages deployment, PR comment, statuses | Yes, for same-repo PRs (see research R2)   |
| `preview-verify.md` (gh-aw) | statuses, PR report comment, evidence artifacts                                 | No (browses the published subsite only)     |

## `always.yml`

**Triggers**: `pull_request` (`opened`, `synchronize`, `reopened`, `closed`),
`push` to `main`, and `workflow_dispatch`.

**Concurrency**: `group: ${{ github.workflow }}`, `cancel-in-progress: false`,
and `queue: max`. One CI run executes at a time across the repository, and
every waiting run is kept.

**Environments**: `verify` runs in `main` (for `refs/heads/main`) or `branch`
(everything else). It exports `vars.SUBSITE_KIND` and `vars.PREVIEW_VERIFY`
as job outputs (`kind`, `preview_verify`), which the later jobs use instead of
checking `github.event_name`. `deploy-pages` runs in `github-pages`.

```text
Verify ──▶ Deploy pages ──▶ E2E tests ──▶ Preview verify
```

| Job              | Runs when                                                                                     | Does                                                                                                                                                                                                                                                                                         | Permissions                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `verify`         | Not `closed`                                                                                   | Builds and runs `npm test` locally as before. `kind=main`: slug `main`. `kind=branch` with a same-repo PR: computes the slug (an invalid branch name sets `error`; rename the branch) and sets `pending` "Waiting for subsite". Any other `SUBSITE_KIND` value fails the job. With a slug, it rebuilds with `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/<slug>` (plus `NEXT_PUBLIC_PREVIEW_*` for PRs) and uploads artifact `site`. On failure: `error` "Verify failed; no subsite was published". | `contents: read`, `actions: read`, `checks: write`, `pull-requests: write`, `statuses: write`; environment `main` or `branch` |
| `deploy-pages`   | `verify` succeeded with a slug, **or** a same-repo PR `closed`                                 | Fetches `gh-pages` and runs `scripts/pages-tree.mjs`: `init`, then `upsert` (publish) or `remove` (closed), then `prune` against open PR branches. If the tree changed: force-pushes a single orphan commit, then runs `upload-pages-artifact`, `configure-pages`, and `deploy-pages`. Creates or updates the `<!-- rnd-subsite -->` PR comment. Collision and size errors set `error`. | `contents: write`, `pages: write`, `id-token: write`, `pull-requests: write`, `statuses: write`; environment `github-pages` |
| `e2e-tests`      | `deploy-pages` succeeded and `verify` produced a slug                                          | Polls `<slug>/preview.json` until `sha` matches (≤ 5 min). Writes `.env.subsite` (`BASE_URL`, `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/<slug>`) and runs `npm test` with `ENV=subsite`, for `main` and branches alike. For `kind=branch`, it sets `pending` "Running end-to-end tests…", and on failure sets `failure` "End-to-end tests failed on the subsite". Publishes JUnit results. | `contents: read`, `actions: read`, `checks: write`, `pull-requests: write`, `statuses: write` |
| `preview-verify` | `e2e-tests` succeeded and `preview_verify == 'true'`                                           | Sets `pending` "Verifying…" and runs `gh workflow run preview-verify.lock.yml --ref <head branch>` with `pr_number`, `sha`, and `slug`.                                                                                                                                                       | `actions: write`, `statuses: write`                                             |

Reruns use GitHub's "Re-run all jobs" on the PR's CI run (FR-019).

## `preview-verify` (gh-aw: `.github/workflows/preview-verify.md` → `.lock.yml`)

| Trigger             | Inputs                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| `workflow_dispatch` | `pr_number` (number), `sha` (string), and `slug` (string); all required |

`on.bots: ["github-actions[bot]"]` lets CI's `GITHUB_TOKEN` dispatch it.

**Concurrency**: `group: preview-verify-${{ inputs.pr_number }}`,
`cancel-in-progress: true`, and `job-discriminator: ${{ inputs.pr_number }}`.
Different PRs verify in parallel, and a newer commit cancels an older run for
the same PR.

| Job              | Purpose                                                                                                         | Permissions / secrets                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `resolve`        | Stops if the PR is closed or its head is not `sha`; otherwise sets `pending` "Scanning…".                         | `pull-requests: read`, `statuses: write`  |
| `scan`           | Runs `npx playwright test --project=preview-scan` with `PREVIEW_SCAN=1`, `BASE_URL=https://percebus.github.io`, and `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/<slug>`. Checks `preview.json.sha` before and after the scan, and a mismatch means `superseded`. Uploads `preview-scan-<sha>`. Sets `failure` on blocking findings, otherwise `pending` "Reviewing…". | `contents: read`, `statuses: write`       |
| `agent`          | Runs the Copilot agent with `playwright-cli` against `/hello-spec-kit/<slug>/` only.                              | gh-aw managed; `COPILOT_GITHUB_TOKEN`     |
| `safe_outputs`   | Processes `add-comment` (report) and `upload-artifact` (`/tmp/gh-aw/preview/*.png`).                              | gh-aw managed                             |
| `record_verdict` | Custom safe-output job that receives `{ outcome: complete \| inconclusive, reason, advisory_count }`. Changes the status only from `pending`. | `statuses: write`                         |
| `finalize`       | Runs with `if: always()`. Changes a status still `pending` after 60 s to `error`. It never deletes the subsite.  | `pull-requests: read`, `statuses: write`  |

**Agent tools**: `playwright-cli:*`, `jq`, `cat`, `ls`, and `gh api:*` (reads
only); GitHub read toolsets `pull_requests` and `issues`;
`network.allowed: [defaults, playwright, "percebus.github.io"]`.

## Build-time environment

| Variable                  | Branch subsite              | `main`                  |
| ------------------------- | --------------------------- | ----------------------- |
| `NEXT_PUBLIC_BASE_PATH`   | `/hello-spec-kit/<slug>`    | `/hello-spec-kit/main`  |
| `NEXT_PUBLIC_PREVIEW_PR`  | PR number                   | unset                   |
| `NEXT_PUBLIC_PREVIEW_REF` | head branch                 | unset                   |
| `NEXT_PUBLIC_PREVIEW_SHA` | head SHA                    | unset                   |

`.env.production` and `.env.development` both use
`NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/main`:

- `next build` loads `.env.production`, so CI's local test build and `main`'s
  build both use `/main`.
- Local tests read the same value from `.env.development`.
- `e2e-tests` writes a git-ignored `.env.subsite` and uses `ENV=subsite` for
  `main` and branches alike.
- The scanner runs with `PREVIEW_SCAN=1`, skips dotenv, and reads `BASE_URL`
  and `NEXT_PUBLIC_BASE_PATH` from the process environment.

## Repository configuration (one-time, manual)

| Item                          | Value                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Pages source                  | Stays **GitHub Actions**                                                                |
| Environment `main`            | Deployment branches: `main`. Variables: `SUBSITE_KIND=main`, `PREVIEW_VERIFY=false`.    |
| Environment `branch`          | Deployment branches: no restriction. Variables: `SUBSITE_KIND=branch`, `PREVIEW_VERIFY=true`. |
| Environment `github-pages`    | Deployment branches must allow PR branches, for example "No restriction".              |
| `gh-pages` branch             | Created by the first deployment. Exclude it from rules that block force-pushes.         |
| Secret `COPILOT_GITHUB_TOKEN` | Existing (see `.github/workflows/README.md`)                                            |
| Ruleset on `main`             | Require status checks `Verify` and `preview-verification`; require a PR                 |
| Follow-up                     | #100: move production to `hello-spec-kit-release`                                       |
