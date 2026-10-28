# Data Model: Pre-merge preview and automated visual verification

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

There is no database. State lives in:

- the `gh-pages` storage branch, which is the R&D site tree;
- GitHub commit statuses;
- workflow runs and their concurrency groups;
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
| `publishedAt` | ISO-8601               | Set by `pages-publish`                                                                  |

**State transitions**:

```text
           publish(sha)                      verification success
(none) ───────────────▶ available(sha) ─────────────────────────────▶ available(sha) [kept]
                           │   ▲                                               │
           publish(sha')   │   │                                               │ PR merged/closed
           (same branch)   ▼   │                                               ▼
                        available(sha')                                     deleted
                           │
                           │ verification fails / inconclusive for sha'
                           │ AND preview.json.sha == sha'
                           ▼
                        deleted ──── rerun (publish) ───▶ available(sha')
```

- `delete(slug, sha)` is **conditional**: it deletes only if `preview.json.sha`
  equals `sha`. This keeps a failed older commit from removing a newer commit's
  subsite.
- `delete(slug)` without a SHA is used when a PR is closed and during pruning.
  It is unconditional.

### Publish Request

This is one `pages-publish` run waiting in the `pages-publish` concurrency
group (`queue: max`, first in, first out).

| Field       | Type                                     | Rules                                                        |
| ----------- | ---------------------------------------- | ------------------------------------------------------------ |
| `op`        | `publish` \| `delete` \| `prune`         |                                                              |
| `slug`      | string                                   | Derived inside the workflow from event data or `pr_number`   |
| `sha`       | string, optional                         | Required for `publish`; makes `delete` conditional           |
| `source`    | `workflow_run` \| `pull_request_target` \| `dispatch` \| `schedule` |                               |

**Staleness rule**: Before publishing a branch subsite, the workflow re-reads
the PR. If the PR is closed, or its head is no longer `sha`, it skips the
publish. A newer CI run will publish the newer head.

### Verification Run

This is one `preview-verify` run for a `(pr, sha, slug)`. Its concurrency group
is `preview-verify-<pr>` with `cancel-in-progress: true`, so a newer commit
cancels an older run for the same PR. Different PRs run in parallel.

| Field            | Type                                         | Rules                                                                                     |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pr`, `sha`, `slug` | from dispatch inputs                      | Immutable                                                                                 |
| `scanResult`     | `clean` \| `blocking` \| `error` \| `superseded` | `superseded` if `preview.json.sha` differs from `sha` before or after the scan             |
| `agentOutcome`   | `complete` \| `inconclusive` \| `missing`     | From the `record-verdict` safe output                                                     |
| `navigationPath` | ordered steps                                | Recorded by the agent                                                                      |
| `intentChecked`  | text                                         | Summary of the PR and issue criteria checked                                               |
| `finalState`     | commit-status state                          | See the table below                                                                        |
| `deleteRequested`| boolean                                      | True when `finalState` is not `success` and `scanResult` is not `superseded`               |

**Final-state derivation** (FR-016 to FR-018):

| `scanResult` | `agentOutcome` | `finalState`            | Subsite      |
| ------------ | -------------- | ----------------------- | ------------ |
| `superseded` | any            | `error` "Superseded"    | Not touched. The newer commit owns it. |
| `blocking`   | any            | `failure`               | Deleted      |
| `error`      | any            | `error`                 | Deleted      |
| `clean`      | `complete`     | `success`               | Kept         |
| `clean`      | `inconclusive` | `error`                 | Deleted      |
| `clean`      | `missing`      | `error`                 | Deleted      |

### Finding

The schema is defined in [contracts/findings.schema.json](./contracts/findings.schema.json).
Only `scanner` findings can be `blocking` (FR-017). Every finding carries
screenshot evidence in an artifact, so it remains available after the subsite
is deleted (FR-012, FR-013).

### Verification Report

There is one PR comment per run, using the format in
[contracts/verification-report.md](./contracts/verification-report.md).

### Override

An override sets `preview-verification=success` for the current head SHA. The
actor must have `admin` or `maintain` permission, and a reason is required. The
override is recorded by a workflow run and a PR comment. It applies only to
that SHA and does not republish the subsite.

## Commit status lifecycle (`preview-verification`)

```text
(push to same-repo PR) ── CI › verify ──▶ pending "Waiting for subsite"
        │ CI fails ─────────────────────▶ (stays pending; Verify check fails → merge blocked)
        ▼ pages-publish
  pending "Publishing subsite…" ──collision/size/deploy error──▶ error
        ▼ dispatch preview-verify
  pending "Scanning…" ──blocking──▶ failure ─┐
        │                 └─crash──▶ error ──┤
        ▼                                    ├─▶ subsite deleted ─(rerun)─▶ pending …
  pending "Reviewing…" ──inconclusive/missing──▶ error ─┘
        │                                    (override) ─▶ success "Override by @…"
        └──complete──▶ success (subsite kept until PR closes)
```
