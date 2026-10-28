# Contract: `preview-verification` commit status

This is the single required status check for merging into `main` (FR-016).
It is written through
`POST /repos/percebus/hello-spec-kit/statuses/{sha}` with `GITHUB_TOKEN`
`statuses: write`.

| Field         | Value                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `context`     | `preview-verification` (exact; the ruleset references this string)     |
| `sha`         | PR head SHA being verified                                             |
| `target_url`  | Workflow run URL                                                       |
| `description` | ≤ 140 characters; prefixes listed below                                |

## States and writers

| State     | Description (prefix)                                  | Written by                                 | Blocks merge? |
| --------- | ----------------------------------------------------- | ------------------------------------------ | ------------- |
| `pending` | `Waiting for subsite`                                 | `always.yml` › `verify`                    | Yes           |
| `pending` | `Publishing subsite…`                                 | `always.yml` › `deploy-pages`              | Yes           |
| `pending` | `Running end-to-end tests…`                           | `always.yml` › `e2e-tests`                 | Yes           |
| `pending` | `Verifying…`                                          | `always.yml` › `preview-verify`            | Yes           |
| `pending` | `Scanning…` / `Reviewing…`                            | `preview-verify` jobs                      | Yes           |
| `failure` | `End-to-end tests failed on the subsite`              | `always.yml` › `e2e-tests`                 | Yes           |
| `failure` | `N blocking finding(s)`                               | `preview-verify` › `scan`                  | Yes           |
| `error`   | `Verify failed; no subsite was published`             | `always.yml` › `verify`                    | Yes           |
| `error`   | `<reason>; rename the branch` / `Address collision with <branch>; rename the branch` | `always.yml` › `verify`, `deploy-pages` | Yes |
| `error`   | `Inconclusive: <reason>`                              | `deploy-pages`, `scan`, `record-verdict`, `finalize` | Yes |
| `error`   | `Superseded by a newer commit`                        | `preview-verify` › `scan`, `finalize` (older SHA only) | No; not the head |
| `success` | `No blocking findings (M advisory)`                   | `preview-verify` › `record-verdict` only   | No            |

## Invariants

1. Only `record-verdict` may set `success`, and only after a clean scan and a
   `complete` agent outcome. There is no override.
2. If the current state for `sha` is `failure`, `record-verdict` MUST NOT set
   `success`.
3. Writers act only on the run's own `sha`, never on the PR's current head.
   Older SHAs are left unchanged.
4. Fork PRs receive no automatic status. The ruleset therefore reports the
   check as "Expected", which blocks merging until the change is pushed to a
   branch in this repository.
5. Statuses never delete subsites. A subsite is deleted only when its pull
   request closes (FR-006).
