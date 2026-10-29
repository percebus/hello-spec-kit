# Architecture Decision Record

## Latest revision

- Date: 2026-10-28
- By: @percebus

## Status

- [ ] Draft
- [x] Proposed
- [ ] Approved
- [ ] Deprecated

## Decision

Use `hello-spec-kit`'s GitHub Pages site as an R&D site with one subsite per
open pull request branch, so every change can be browsed and verified before it
reaches `main`.

```text
https://percebus.github.io/hello-spec-kit/
├── index.html        → redirects to ./main/
├── main/             → main branch (interim production)
├── <branch-slug>/    → one subsite per open same-repo PR branch
└── subsites.json     → slug → branch, PR, SHA
```

- **Storage and publishing**: The site tree lives on a `gh-pages` storage
  branch as a single orphan commit. The CI workflow runs
  `Verify → Deploy pages → E2E tests` for every branch. When CI succeeds on
  `main`, `preview-verify` starts on `workflow_run`. `pull_request_closed.yml` deletes closed pull
  requests' subsites.
  `deploy-pages` changes one folder at a time and redeploys the whole tree
  with `actions/deploy-pages`. CI runs one at a time
  (`group: ${{ github.workflow }}`, `queue: max`), so deployments never lose
  each other's changes. Differences between `main` and branches come from the
  `main` and `branch` environments' variables.
- **Verification** (after merge): Once `main/` passes its end-to-end tests, a
  deterministic Playwright scanner (`preview-scan`) crawls it at 320 px and
  1440 px for blocking defects: missing images, broken links, overflow,
  horizontal scrolling, and browser errors. A GitHub Agentic Workflow
  (`preview-verify`) clicks through to the change and checks it against the
  merged pull request's stories. The report is posted on the pull request and
  on every issue it closes. Those issues are reopened when there is a blocking
  defect or an intent mismatch. Subsites, including failing ones, are kept
  until their pull request closes.
- **Addresses**: A branch name becomes a flat slug. It is lowercased and every
  run of characters outside `[a-z0-9]` becomes `-`. Names longer than 63
  characters keep 54 characters plus an 8-hex SHA-256 suffix of the original
  name. `main` is reserved, and collisions are rejected explicitly.
- **Merge gate**: The `preview-verification` commit status is required on
  `main`, alongside `Verify`. It passes when the subsite passes the
  end-to-end tests. There is no override.

## Justification

- All source stays in one repository, and no extra token or third-party host is
  needed.
- Subsites use the same hosting and base-path mechanism as `main`, so they
  catch the class of bug in #85: an asset URL that skips the base path.
- Merge decisions stay reproducible, because AI judgment is advisory only.
- Moving production to a dedicated release repository is tracked in #100.

See `specs/002-pr-preview-verification/research.md` (R1, R2, R4, R8) for the
alternatives considered.
