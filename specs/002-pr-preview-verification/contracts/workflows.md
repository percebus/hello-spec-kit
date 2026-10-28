# Contract: Workflow interfaces

## `preview-verify` (gh-aw: `.github/workflows/preview-verify.md` → `.lock.yml`)

| Trigger             | Filter / inputs                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `pull_request`      | `types: [opened, synchronize, reopened, ready_for_review]`, `branches: [main]`; same-repo heads only    |
| `workflow_dispatch` | `pr_number` (number, required). Use it for reruns (FR-019) and maintainer-approved fork PRs.            |

**Concurrency**: `group: preview-environment`, `cancel-in-progress: false`,
`queue: max`. This is a workflow-level queue shared by all PRs.

**Jobs**, in order:

| Job              | Purpose                                                                                     | Permissions / secrets                                 |
| ---------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `resolve`        | Resolve `pr`, `sha`, `ref`, and the fork flag. Run the staleness guard; outputs `proceed`.  | `pull-requests: read`, `statuses: write`              |
| `build`          | Run `npm install` and `next build` with the preview env. Upload `out/` as the `preview-out-<sha>` artifact. | `contents: read`; no secrets; `persist-credentials: false` |
| `deploy`         | Push the artifact, `.nojekyll`, and `preview.json` to the preview repo's `gh-pages` branch. Poll the manifest. Post the address on the PR (FR-005). | `PREVIEW_PAGES_TOKEN`, `pull-requests: write`, `statuses: write` |
| `scan`           | Run `ENV=preview npx playwright test --project=preview-scan`. Upload `preview-scan-<sha>`; set `failure` on blocking findings. | `contents: read`, `statuses: write`                   |
| `agent`          | Run the gh-aw Copilot agent with `playwright-cli` against the preview and read-only GitHub tools. | gh-aw managed; `COPILOT_GITHUB_TOKEN`                 |
| `safe_outputs`   | Handle `add-comment` (report) and `upload-artifact` (screenshots).                          | gh-aw managed                                         |
| `record_verdict` | Custom safe-output job: `{ outcome, reason }` sets `success` or `error`.                    | `statuses: write`                                     |
| `finalize`       | Fallback with `if: always()`: still `pending` becomes `error`.                              | `statuses: write`                                     |

**Agent tools**: `playwright-cli:*`, `jq`, `cat`, and `ls`; GitHub read
toolsets `pull_requests` and `issues`; `network.allowed: [defaults, playwright,
"percebus.github.io"]`.

**`record-verdict` safe-output tool input**:

| Field     | Type                          | Required                   |
| --------- | ----------------------------- | -------------------------- |
| `outcome` | `complete` \| `inconclusive`  | yes                        |
| `reason`  | string ≤ 120 characters       | yes when `inconclusive`    |

## `preview-override` (`.github/workflows/preview-override.yml`)

| Trigger             | Inputs                                                       |
| ------------------- | ------------------------------------------------------------ |
| `workflow_dispatch` | `pr_number` (number, required) and `reason` (string, required) |

The workflow fails unless the actor has `admin` or `maintain` permission. On
success, it writes the override status (see [commit-status.md](./commit-status.md))
and posts a PR comment.

## `always.yml` addition: `preview-enqueue` job

Runs on `pull_request` only when
`head.repo.full_name == github.repository`. It sets `preview-verification` to
`pending` / `Queued for shared preview`. Permission: `statuses: write`.

## Build-time environment (preview builds only)

| Variable                   | Value                         |
| -------------------------- | ----------------------------- |
| `NEXT_PUBLIC_BASE_PATH`    | `/hello-spec-kit-preview`     |
| `NEXT_PUBLIC_PREVIEW_PR`   | PR number                     |
| `NEXT_PUBLIC_PREVIEW_REF`  | head branch                   |
| `NEXT_PUBLIC_PREVIEW_SHA`  | head SHA                      |

When the `NEXT_PUBLIC_PREVIEW_*` variables are unset, as in production, the
output contains no banner and no `noindex` marker.

## Repository configuration (one-time, manual)

| Item                                       | Value                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Preview repository                         | `percebus/hello-spec-kit-preview` (public; Pages source: `gh-pages` / root) |
| Secret `PREVIEW_PAGES_TOKEN`               | Fine-grained PAT: Contents read/write on the preview repository only     |
| Secret `COPILOT_GITHUB_TOKEN`              | Existing (see `.github/workflows/README.md`)                             |
| Ruleset on `main`                          | Require status checks `Verify` and `preview-verification`; require a PR  |
