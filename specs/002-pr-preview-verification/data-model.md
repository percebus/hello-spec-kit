# Data Model: Pre-merge preview and automated visual verification

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

There is no database. State lives in four places:

- GitHub commit statuses
- Workflow runs and the concurrency queue
- Workflow artifacts
- The preview repository's `gh-pages` branch

## Entities

### Preview (single slot)

The one shared deployment at
`https://percebus.github.io/hello-spec-kit-preview/`. Its identity is
published as `preview.json` (see
[contracts/preview-manifest.schema.json](./contracts/preview-manifest.schema.json)).

| Field         | Type                  | Rules                                                                             |
| ------------- | --------------------- | --------------------------------------------------------------------------------- |
| `pr`          | integer               | Open PR targeting `main`                                                          |
| `ref`         | string                | PR head branch name; rendered as escaped text                                     |
| `sha`         | string (40 hex chars) | Must equal the PR head SHA when deployment starts                                 |
| `runUrl`      | URL                   | Workflow run that deployed it                                                     |
| `deployedAt`  | ISO-8601 timestamp    | Set by the deploy job                                                             |
| `address`     | URL                   | Always `https://percebus.github.io/hello-spec-kit-preview/`, distinct from production |

Exactly one Preview exists at a time. A new deployment replaces the previous
one and never coexists with it.

**States**:

```text
building ──▶ available
    │
    └──────▶ failed
```

A Preview is **available** only after `preview.json` at the address reports the
expected `sha`. A **failed** deployment leaves the previous contents in place,
and its verification run ends in `error`.

### Queue Entry

A verification workflow run waiting in the `preview-environment` concurrency
group with `queue: max`.

| Field        | Type                         | Rules                                                |
| ------------ | ---------------------------- | ---------------------------------------------------- |
| `pr`         | integer                      | From the `pull_request` event or dispatch input      |
| `sha`        | string                       | Head SHA when the run was created                    |
| `trigger`    | `pull_request` \| `dispatch` | `dispatch` is used for reruns and fork PRs           |
| `enqueuedAt` | timestamp                    | Determines FIFO order                                |

**Staleness rule**: When an entry reaches the front of the queue, `resolve`
re-reads the PR. If the PR is closed, its head is no longer `sha`, or it is an
undispatched fork PR, the run exits without deploying or changing any status.
This implements FR-004 (newest push wins per branch) and FR-006 (closed PRs
leave the queue).

### Verification Run

One deploy, scan, and review cycle for a single `(pr, sha)`.

| Field             | Type                                                              | Rules                                                        |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `pr`, `sha`       | from Queue Entry                                                  | Immutable                                                    |
| `scanResult`      | `clean` \| `blocking` \| `error`                                  | From the scanner job                                         |
| `agentOutcome`    | `complete` \| `inconclusive` \| `missing`                         | From the `record-verdict` safe output; `missing` if never called |
| `navigationPath`  | ordered list of steps (page URL and visible link or control text) | Recorded by the agent                                        |
| `intentChecked`   | text                                                              | Summary of the PR or issue criteria being checked            |
| `finalState`      | commit-status state                                               | Derived from `scanResult` and `agentOutcome`, as shown below |

**Final-state derivation** (FR-016 to FR-018):

| `scanResult` | `agentOutcome`           | `finalState` | Description prefix                           |
| ------------ | ------------------------ | ------------ | -------------------------------------------- |
| `blocking`   | any                      | `failure`    | `N blocking finding(s)`                      |
| `error`      | any                      | `error`      | `Inconclusive: scan did not complete`        |
| `clean`      | `complete`               | `success`    | `No blocking findings (M advisory)`          |
| `clean`      | `inconclusive`           | `error`      | `Inconclusive: <reason>`                     |
| `clean`      | `missing`                | `error`      | `Inconclusive: reviewer did not record a verdict` |

### Finding

One observed defect or concern. The schema is in
[contracts/findings.schema.json](./contracts/findings.schema.json).

| Field         | Type                                                                                                              | Rules                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`          | string                                                                                                            | Stable within a run, for example `scan-0007` or `agent-0002`                                   |
| `source`      | `scanner` \| `agent`                                                                                              | Only `scanner` findings can be `blocking` (FR-017)                                             |
| `severity`    | `blocking` \| `advisory`                                                                                          | `blocking` is allowed only for the FR-010 categories                                           |
| `category`    | `missing-image` \| `broken-link` \| `overflow` \| `horizontal-scroll` \| `browser-error` \| `media-error` \| `external-link` \| `intent-mismatch` \| `visual-concern` | `external-link`, `intent-mismatch`, and `visual-concern` are always advisory                   |
| `page`        | URL path relative to the preview base                                                                             | Required                                                                                       |
| `viewport`    | `320` \| `1440`                                                                                                   | Required                                                                                       |
| `description` | text                                                                                                              | Plain language and at most 500 characters                                                      |
| `selector`    | string, optional                                                                                                  | CSS selector or accessible name of the element                                                 |
| `evidence`    | object `{ artifact, file }`                                                                                       | Required (FR-012); `file` is a screenshot inside the named artifact                            |

### Verification Report

One PR comment per verification run. The format is in
[contracts/verification-report.md](./contracts/verification-report.md).
It references a Verification Run and all of its Findings, grouped by severity.

### Override

A maintainer decision that sets `preview-verification=success` despite a
failed or inconclusive run (FR-018).

| Field    | Type                                | Rules                                            |
| -------- | ----------------------------------- | ------------------------------------------------ |
| `pr`     | integer                             | Open PR                                          |
| `sha`    | string                              | Current PR head SHA; resolved at override time   |
| `actor`  | GitHub login                        | Must have `admin` or `maintain` permission       |
| `reason` | text                                | Required and non-empty                           |
| `trail`  | workflow run URL and PR comment URL | Required                                         |

An override applies only to `sha`. A new push resets the gate to `pending`.

## Commit status lifecycle (`preview-verification`)

```text
(push to same-repo PR)
        │  always.yml › preview-enqueue
        ▼
  pending "Queued for shared preview"
        │  preview-verify run starts
        ▼
  pending "Deploying preview…" ──deploy fails──▶ error
        │
        ▼
  pending "Scanning…" ──blocking findings──▶ failure ──(override)──▶ success
        │                    │
        │                    └─scan crash──▶ error ─────(override)──▶ success
        ▼
  pending "Reviewing…" ──agent inconclusive/missing──▶ error ──(override)──▶ success
        │
        └──agent complete──▶ success
```

A push of a new SHA starts a new lifecycle for that SHA. Statuses on older
SHAs are left as they are and no longer affect mergeability.
