# Contract: Workflow interfaces

Three workflows own all changes to the R&D site and the merge gate:

| Workflow                 | Writes                                                               | Runs PR code? |
| ------------------------ | -------------------------------------------------------------------- | ------------- |
| `always.yml` (CI)        | `site` artifact; `pending` status                                    | Yes (build/test only, no secrets) |
| `pages-publish.yml`      | `gh-pages` storage branch, Pages deployment, PR comment, statuses    | **No**        |
| `preview-verify.md` (gh-aw) | statuses, PR report comment, evidence artifacts                   | No (browses the published subsite only) |
| `preview-override.yml`   | `success` status and PR comment                                      | No            |

## `always.yml` changes

- **`verify` job (existing)**:
  - Build and test exactly as before.
  - **Add**: on same-repo `pull_request`, set the `preview-verification`
    status to `pending` with "Waiting for subsite" (`statuses: write`).
  - **Add**: rebuild with explicit `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/<slug>`
    and the `NEXT_PUBLIC_PREVIEW_PR`, `_REF`, and `_SHA` variables. For `main`,
    use `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/main` and no preview variables.
    Upload the result as artifact `site` (retention 14 days).
  - Compute `<slug>` with the shared slug rule (research R8). It is used only
    for the base path; `pages-publish` recomputes it from trusted data.
- **Remove**: the `deploy-pages` and `e2e-tests` jobs. Both move to
  `pages-publish`.

## `pages-publish.yml`

**Concurrency**: `group: pages-publish`, `cancel-in-progress: false`,
`queue: max`.

| Trigger                                                        | Operation                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `workflow_run`: `workflows: ["[C]ontinuous [I]ntegration"]`, `types: [completed]` | If the conclusion is `success` and the head repository is this repository, `publish`. The slug comes from `head_branch` (`main` → `main`), the SHA from `head_sha`, and the PR from `pull_requests[0]`. |
| `pull_request_target`: `types: [closed]`, `branches: [main]`    | Unconditional `delete` of the branch's slug. **Never checks out PR code.**                       |
| `workflow_dispatch`: `op` (`publish`\|`delete`\|`prune`), `pr_number`, `slug`, `sha` (optional) | Rerun publish (FR-019), conditional delete after a failed verification (FR-006), or prune. |
| `schedule`: hourly                                             | `prune`: delete subsites whose PR is no longer open (SC-008 safety net).                          |

**Jobs**:

| Job           | Steps                                                                                                                                                         | Permissions / environment                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `prepare`     | Resolve `op`, `slug`, `sha`, and `pr`. Run the staleness and slug checks: reserved name, collision, open PR, and head equal to `sha`. For publish, download artifact `site` from the CI run (`run-id`). | `actions: read`, `pull-requests: read`, `statuses: write`, `contents: read` |
| `update-tree` | Check out `gh-pages`, or initialize it with `index.html`, `.nojekyll`, and `subsites.json`. Apply the operation: replace `<slug>/` with the artifact plus `preview.json`, or remove `<slug>/`, conditionally for a delete with a SHA. Also prune closed PRs. Enforce the 1 GB limit. Force-push a single orphan commit. Upload the Pages artifact. | `contents: write`                                            |
| `deploy`      | `actions/deploy-pages`.                                                                                                                                       | `pages: write`, `id-token: write`; environment `github-pages` |
| `announce`    | Poll `<slug>/preview.json` until `sha` matches (≤ 5 min). For a branch publish: post or update the PR comment with the subsite address (FR-005), set the status to `pending` "Verifying…", and dispatch `preview-verify` with `pr_number`, `sha`, and `slug`. For a `main` publish: run the production end-to-end tests (`ENV=production npm test`) against `/hello-spec-kit/main/`. | `actions: write`, `pull-requests: write`, `statuses: write`  |

Any `prepare`, `update-tree`, or `deploy` failure on a branch publish sets
`preview-verification=error` with the reason.

## `preview-verify` (gh-aw: `.github/workflows/preview-verify.md` → `.lock.yml`)

| Trigger             | Inputs                                                            |
| ------------------- | ----------------------------------------------------------------- |
| `workflow_dispatch` | `pr_number` (number), `sha` (string), and `slug` (string); all required |

**Concurrency**: `group: preview-verify-${{ inputs.pr_number }}`,
`cancel-in-progress: true`. This overrides the gh-aw default, which would
serialize all dispatches. PRs verify in parallel, and a newer commit cancels an
older run for the same PR.

| Job              | Purpose                                                                                                         | Permissions / secrets                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `resolve`        | Stop if the PR is closed or its head is not `sha`.                                                               | `pull-requests: read`                     |
| `scan`           | Run `npx playwright test --project=preview-scan` with `BASE_URL=https://percebus.github.io` and `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/<slug>`. Check `preview.json.sha` before and after; a mismatch means `superseded`. Upload `preview-scan-<sha>`. Set `failure` on blocking findings. | `contents: read`, `statuses: write`       |
| `agent`          | Run the Copilot agent with `playwright-cli` against `/hello-spec-kit/<slug>/` only.                               | gh-aw managed; `COPILOT_GITHUB_TOKEN`     |
| `safe_outputs`   | Process `add-comment` (report) and `upload-artifact` (`/tmp/gh-aw/preview/*.png`).                                | gh-aw managed                             |
| `record_verdict` | Custom safe-output job that receives `{ outcome: complete \| inconclusive, reason }`.                            | `statuses: write`                         |
| `finalize`       | Runs with `if: always()`. Changes `pending` to `error`. If the final state is not `success` and the run was not superseded, dispatch `pages-publish` with `op=delete`, `slug`, and `sha`. | `statuses: write`, `actions: write`       |

**Agent tools**: `playwright-cli:*`, `jq`, `cat`, and `ls`; GitHub read
toolsets `pull_requests` and `issues`; `network.allowed: [defaults, playwright,
"percebus.github.io"]`.

## `preview-override.yml`

`workflow_dispatch` with `pr_number` and `reason`, both required. It fails
unless the actor has `admin` or `maintain` permission. It writes the override
status ([commit-status.md](./commit-status.md)) and a PR comment. It does not
republish anything.

## Build-time environment

| Variable                  | Branch subsite              | `main`                  |
| ------------------------- | --------------------------- | ----------------------- |
| `NEXT_PUBLIC_BASE_PATH`   | `/hello-spec-kit/<slug>`    | `/hello-spec-kit/main`  |
| `NEXT_PUBLIC_PREVIEW_PR`  | PR number                   | unset                   |
| `NEXT_PUBLIC_PREVIEW_REF` | head branch                 | unset                   |
| `NEXT_PUBLIC_PREVIEW_SHA` | head SHA                    | unset                   |

`.env.production` changes to `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/main` for
production end-to-end tests. `.env.development` stays unchanged for local
tests.

## Repository configuration (one-time, manual)

| Item                     | Value                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Pages source             | Stays **GitHub Actions**                                                                |
| `github-pages` environment | No change. All deployments run from `main`'s context.                                  |
| `gh-pages` branch        | Created by the first `pages-publish` run. Exclude it from branch rulesets that block force-pushes. |
| Secret `COPILOT_GITHUB_TOKEN` | Existing (see `.github/workflows/README.md`)                                       |
| Ruleset on `main`        | Require status checks `Verify` and `preview-verification`; require a PR                 |
| Follow-up                | #100: move production to `hello-spec-kit-release`                                       |
