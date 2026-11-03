# Contract: `preview-verification` commit status

The post-merge review writes this context on the `main` commit for information
only. It does not gate merges: merging is what starts the review. The pre-merge
gate is the `E2E result` check of `always.yml` (FR-016), not a commit status.
It is written through `POST /repos/percebus/hello-spec-kit/statuses/{sha}` with
`GITHUB_TOKEN` `statuses: write`.

| Field         | Value                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `context`     | `preview-verification` (exact)                                         |
| `sha`         | `main` commit (post-merge review)                                      |
| `target_url`  | Workflow run URL                                                       |
| `description` | ≤ 140 characters; prefixes listed below                                |

## Pre-merge gate (`E2E result` check)

| Outcome | Reason                                                                     |
| ------- | -------------------------------------------------------------------------- |
| Pass    | The subsite was published and passed its end-to-end tests in every browser |
| Fail    | Invalid branch slug or address collision; rename the branch                |
| Fail    | The subsite was not published (`Verify` or `Deploy pages` failed, or a fork PR) |
| Fail    | End-to-end tests failed on the subsite                                     |

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

1. Pre-merge, only `E2E result` gates the merge, alongside `Verify`. There is
   no override.
2. Post-merge, only `record-verdict` may set `success`, and only after a clean
   scan and a `complete` agent outcome. If the current state is `failure`, it
   MUST NOT set `success`.
3. Writers act only on the run's own `sha`. Older SHAs are left unchanged.
4. Fork PRs are not deployed, so `E2E result` fails for them until the change
   is pushed to a branch in this repository.
5. Checks and statuses never delete subsites. A subsite is deleted only when
   its pull request closes (FR-006).