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

This is one run of `always.yml`. Runs share a single workflow-wide concurrency
group (`group: ${{ github.workflow }}`, `cancel-in-progress: false`,
`queue: max`), so they execute one at a time, first in, first out, and none
are dropped.

| Field     | Source                                             | Rules                                                              |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| `kind`    | Environment variable `SUBSITE_KIND` (`main`\|`branch`) | Environment `main` for `refs/heads/main`, otherwise `branch`; any other value fails `verify` |
| `preview_verify` | Environment variable `PREVIEW_VERIFY` (`true`\|`false`) | Whether `preview-verify` is dispatched after `e2e-tests`          |
| `slug`    | `main`, or the branch slug (research R8)           | Empty for forks, non-PR branch runs, or reserved names, so nothing is deployed |
| `op`      | `publish` in `always.yml`; `delete` in `pull_request_closed.yml` | Both run the `.github/pages` action from the default branch's checkout (closed) or the run's checkout (publish) |

### Verification Run

This is one `preview-verify` run for a `(pr, sha, slug)`, dispatched by CI only
after `e2e-tests` pass. Its concurrency group is `preview-verify-<pr>` with
`cancel-in-progress: true`. Different PRs run in parallel.

| Field            | Type                                         | Rules                                                                                     |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pr`, `sha`, `slug` | from dispatch inputs                      | Immutable                                                                                 |
| `scanResult`     | `clean` \| `blocking` \| `error` \| `superseded` | `superseded` if `preview.json.sha` differs from `sha` before or after the scan             |
| `agentOutcome`   | `complete` \| `inconclusive` \| `missing`     | From the `record-verdict` safe output                                                     |
| `navigationPath` | ordered steps                                | Recorded by the agent                                                                      |
| `intentChecked`  | text                                         | Summary of the PR and issue criteria checked                                               |
| `finalState`     | commit-status state                          | See the table below                                                                        |

**Final-state derivation** (FR-016 to FR-018):

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
Only `scanner` findings can be `blocking` (FR-017). Every finding carries
screenshot evidence in an artifact, so it remains available after the subsite
is deleted (FR-012, FR-013).

### Verification Report

There is one PR comment per run, using the format in
[contracts/verification-report.md](./contracts/verification-report.md).

## Commit status lifecycle (`preview-verification`)

```text
(push to same-repo PR) ── verify ──▶ pending "Waiting for subsite"
        │ verify fails ─────────────────────▶ error "Verify failed…"
        ▼ deploy-pages
  pending "Publishing subsite…" ──collision/size/deploy error──▶ error
        ▼ e2e-tests
  pending "Running end-to-end tests…" ──fail──▶ failure
        ▼ preview-verify (dispatch)
  pending "Verifying…" ▶ "Scanning…" ──blocking──▶ failure
        │                    └─crash──▶ error
        ▼
  pending "Reviewing…" ──inconclusive/missing──▶ error
        │
        └──complete──▶ success
```

There is no override. Any non-`success` state is resolved by pushing a fix or
by re-running the CI workflow. The subsite is never deleted by a status; it is
deleted only when the pull request closes.