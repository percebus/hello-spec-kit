# Data Model: Pre-merge preview and automated visual verification

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

There is no database. State lives in:

- the `gh-pages` storage branch, which is the R&D site tree;
- GitHub commit statuses;
- workflow runs and their concurrency groups;
- GitHub environment variables (`main`, `branch`);
- workflow artifacts.

## Entities

### R&D Site

This is the whole published tree at `https://percebus.github.io/hello-spec-kit/`.
It has one `main` subsite, zero or more branch subsites, a root `index.html`
that redirects to `./main/`, `.nojekyll`, and `subsites.json`, which follows
[contracts/subsites-index.schema.json](./contracts/subsites-index.schema.json).

**Invariants**:

- `main/` is always present after the first publish from `main`.
- Every folder except `main/` has exactly one entry in `subsites.json`, and
  every entry has a folder.
- The total size must stay under 1 GB, the GitHub Pages limit. A publish fails
  with a clear error instead of pruning other subsites.

### Subsite

This is one folder `<slug>/` holding a complete static export built with
`NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/<slug>`. Its identity is published at
`<slug>/preview.json`
([contracts/subsite-manifest.schema.json](./contracts/subsite-manifest.schema.json)).

| Field         | Type                   | Rules                                                                                   |
| ------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `slug`        | string                 | Derived from the event branch name (research R8); `main` reserved for the `main` branch |
| `kind`        | `branch` \| `main`     | `main` only for the `main` branch                                                       |
| `branch`      | string                 | From the trusted event payload, not the artifact                                        |
| `pr`          | integer \| null        | Required for `branch`; `null` for `main`                                                |
| `sha`         | 40-character hex       | The commit built                                                                        |
| `ciRunUrl`    | URL                    | CI run that produced the artifact                                                       |
| `publishedAt` | ISO-8601               | Set by `deploy-pages`                                                                   |

**State transitions**:

```text
          publish(sha)                       push(sha') on same branch
(none) ──────────────▶ available(sha) ──────────────────────────────▶ available(sha')
                            │
                            │ PR merged/closed (or no longer open at the next prune)
                            ▼
                         deleted
```

A failing verification does not change the subsite. It stays available for
inspection until the next push or until the pull request closes (FR-006).

### CI Run

This is one run of `always.yml`. Its concurrency group is
`${{ github.ref }}-${{ github.workflow }}` with `cancel-in-progress: true`, so
a newer push to the same ref cancels the older run, and different refs run in
parallel. Only `deploy-pages` is serialized, through the job-level group
`pages` with `queue: max`.

| Field     | Source                                             | Rules                                                              |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| `kind`    | Workflow `env.KIND`: `github.ref_name == 'main' && 'main' \|\| 'branch'` | No GitHub environment is involved                      |
| `slug`    | `deploy-pages` output: `main`, or the branch slug (research R8) | Empty for reserved names, so nothing is deployed. `deploy-pages` skips forks and non-PR branch runs. |
| `op`      | `publish` in `always.yml`; `delete` in `pull_request_closed.yml` | Both run the `replace-pages-artifact` action from the default branch's checkout (closed) or the run's checkout (publish) |

### Verification Run

This is one post-merge `preview-verify` run for the `main` commit `sha`
(`workflow_run.head_sha`) and the merged `pr` behind it. It starts on
`workflow_run` when CI succeeds on a push to `main`, after `main/` passes
`e2e-tests`. Its concurrency group is `preview-verify-<sha>`.

| Field            | Type                                         | Rules                                                                                     |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `sha`            | `github.event.workflow_run.head_sha`          | Immutable                                                                                 |
| `pr`             | `resolve` via `GET /commits/{sha}/pulls`      | Merged into `main`; none means a direct push, and nothing runs                            |
| `scanResult`     | `clean` \| `blocking` \| `error` \| `superseded` | `superseded` if `preview.json.sha` differs from `sha` before or after the scan             |
| `agentOutcome`   | `complete` \| `inconclusive` \| `missing`     | From the `record-verdict` safe output                                                     |
| `navigationPath` | ordered steps                                | Recorded by the agent                                                                      |
| `intentChecked`  | text                                         | Summary of the PR and issue criteria checked                                               |
| `finalState`     | commit-status state (informational, on `main`) | See the table below                                                                      |
| `storiesDone`    | `done` \| `not-done` \| `unknown`             | `not-done` when `scanResult = blocking` or any `intent-mismatch`; `unknown` when inconclusive |
| `linkedIssues`   | issue numbers                                | The PR's `closingIssuesReferences`; the only issues commented on or reopened              |
| `reopened`       | issue numbers                                | Closed linked issues reopened when `storiesDone = not-done` (FR-021)                       |

**Final-state derivation**:

| `scanResult` | `agentOutcome` | `finalState`            |
| ------------ | -------------- | ----------------------- |
| `superseded` | any            | `error` "Superseded"    |
| `blocking`   | any            | `failure`               |
| `error`      | any            | `error`                 |
| `clean`      | `complete`     | `success`               |
| `clean`      | `inconclusive` | `error`                 |
| `clean`      | `missing`      | `error`                 |

### Finding

The schema is defined in [contracts/findings.schema.json](./contracts/findings.schema.json).
Only `scanner` findings can be `blocking`. Blocking findings and agent
`intent-mismatch` findings make the stories not done (FR-021). Every finding
carries screenshot evidence in an artifact (FR-012, FR-013).

### Verification Report

There is one comment on the merged PR and one on each linked issue per run,
all with the same body, using the format in
[contracts/verification-report.md](./contracts/verification-report.md).

## Commit status lifecycle (`preview-verification`)

Pre-merge, on the PR head SHA (the merge gate):

```text
(push to same-repo PR) ── verify (no status; failure ⇒ check stays "Expected")
        ▼ deploy-pages
  pending "Building subsite…" ▶ "Publishing subsite…" ──collision/size/build/deploy error──▶ error
        ▼ e2e-tests
  pending "Running end-to-end tests…" ──fail──▶ failure
        │
        └──pass──▶ success "Subsite passed end-to-end tests"
```

Post-merge, on the `main` commit (informational; effects go to the PR and
issues):

```text
(merge → push to main) ── CI: verify ▶ deploy-pages ▶ e2e-tests ── success ──▶ preview-verify (workflow_run)
  pending "Scanning…" ──blocking──▶ failure            ─┐
        │            └─main moved on──▶ error "Superseded" (nothing posted)
        ▼                                               ├─▶ report on PR + issues
  pending "Reviewing…" ──inconclusive/missing──▶ error ─┤   (reopen issues if not done)
        └──complete──▶ success ─────────────────────────┘
```

There is no override. Any pre-merge non-`success` state is resolved by pushing
a fix or by re-running the CI workflow. The subsite is never deleted by a status; it is
deleted only when the pull request closes.