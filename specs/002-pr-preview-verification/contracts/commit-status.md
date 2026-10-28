# Contract: `preview-verification` commit status

This is the single required status check for merging into `main` (FR-016).
It is written through
`POST /repos/percebus/hello-spec-kit/statuses/{sha}` with `GITHUB_TOKEN`
`statuses: write`.

| Field         | Value                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `context`     | `preview-verification` (exact; the ruleset references this string)     |
| `sha`         | PR head SHA being verified                                             |
| `target_url`  | Workflow run URL; for an override, the override run URL               |
| `description` | ≤ 140 characters; prefixes listed below                                |

## States and writers

| State     | Description (prefix)                                  | Written by                                 | Blocks merge? |
| --------- | ----------------------------------------------------- | ------------------------------------------ | ------------- |
| `pending` | `Waiting for subsite`                                 | `always.yml` › `verify`                    | Yes           |
| `pending` | `Publishing subsite…` / `Verifying…`                  | `pages-publish`                            | Yes           |
| `pending` | `Scanning…` / `Reviewing…`                            | `preview-verify` jobs                      | Yes           |
| `failure` | `N blocking finding(s)`                               | `preview-verify` › `scan`                  | Yes           |
| `error`   | `Inconclusive: <reason>`                              | `pages-publish`, `scan`, `record-verdict`, `finalize` | Yes |
| `error`   | `Address collision with <branch>; rename the branch`  | `pages-publish` › `prepare`                | Yes           |
| `error`   | `Superseded by a newer commit`                        | `preview-verify` › `finalize` (older SHA only) | No; not the head |
| `success` | `No blocking findings (M advisory)`                   | `preview-verify` › `record-verdict` only   | No            |
| `success` | `Override by @<actor>: <reason>`                      | `preview-override.yml` only                | No            |

## Invariants

1. Only `record-verdict`, after a clean scan and a `complete` agent outcome,
   and `preview-override` may set `success`.
2. If the current state for `sha` is `failure`, `record-verdict` MUST NOT set
   `success`.
3. Writers act only on the run's own `sha`, never on the PR's current head.
   Older SHAs are left unchanged.
4. Fork PRs receive no automatic status. The ruleset therefore reports the
   check as "Expected", which blocks merging until a maintainer dispatches a
   publish or records an override.
5. Any final state other than `success`, except `Superseded`, triggers a
   conditional delete of the subsite (FR-006).
