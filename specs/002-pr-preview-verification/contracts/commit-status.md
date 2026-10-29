# Contract: `preview-verification` commit status

Before merge, this is the single required status check for merging into
`main` (FR-016). After merge, the post-merge review writes the same context on
the `main` commit for information only. It is written through
`POST /repos/percebus/hello-spec-kit/statuses/{sha}` with `GITHUB_TOKEN`
`statuses: write`.

| Field         | Value                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `context`     | `preview-verification` (exact; the ruleset references this string)     |
| `sha`         | PR head SHA (pre-merge) or `main` commit (post-merge review)           |
| `target_url`  | Workflow run URL                                                       |
| `description` | ≤ 140 characters; prefixes listed below                                |

## Pre-merge states (PR head SHA)

| State     | Description (prefix)                                  | Written by                                 | Blocks merge? |
| --------- | ----------------------------------------------------- | ------------------------------------------ | ------------- |
| `pending` | `Building subsite…`                                   | `always.yml` › `deploy-pages`              | Yes           |
| `pending` | `Publishing subsite…`                                 | `always.yml` › `deploy-pages` (action)     | Yes           |
| `pending` | `Running end-to-end tests…`                           | `always.yml` › `e2e-tests`                 | Yes           |
| `success` | `Subsite passed end-to-end tests`                     | `always.yml` › `e2e-tests`                 | No            |
| `failure` | `End-to-end tests failed on the subsite`              | `always.yml` › `e2e-tests`                 | Yes           |
| `error`   | `<reason>; rename the branch` / `Address collision with <branch>; rename the branch` | `always.yml` › `deploy-pages` | Yes |
| `error`   | `Inconclusive: building or publishing the subsite failed` | `always.yml` › `deploy-pages`          | Yes           |

`verify` writes no status. If it fails, `deploy-pages` never runs, the status
is never reported, and the required check stays "Expected". That blocks the
merge, along with the failing `Verify` check itself.

## Post-merge states (`main` commit, informational)

| State     | Description (prefix)                                  | Written by                                 |
| --------- | ----------------------------------------------------- | ------------------------------------------ |
| `pending` | `Scanning…` / `Reviewing…`                            | `preview-verify` › `resolve`, `scan`       |
| `failure` | `N blocking finding(s)`                               | `preview-verify` › `scan`                  |
| `error`   | `Inconclusive: <reason>`                              | `scan`, `record-verdict`, `finalize`       |
| `error`   | `Superseded: main moved on before the scan finished`  | `preview-verify` › `scan`                  |
| `success` | `No blocking findings (M advisory)`                   | `preview-verify` › `record-verdict` only   |

Whether the stories are done is reported on the PR and its closing issues, not
through the status. Issues are reopened when not done (FR-021).

## Invariants

1. Pre-merge, only `e2e-tests` may set `success`. There is no override.
2. Post-merge, only `record-verdict` may set `success`, and only after a clean
   scan and a `complete` agent outcome. If the current state is `failure`, it
   MUST NOT set `success`.
3. Writers act only on the run's own `sha`. Older SHAs are left unchanged.
4. Fork PRs receive no automatic status. The ruleset therefore reports the
   check as "Expected", which blocks merging until the change is pushed to a
   branch in this repository.
5. Statuses never delete subsites. A subsite is deleted only when its pull
   request closes (FR-006).