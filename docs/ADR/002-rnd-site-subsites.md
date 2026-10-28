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
  `Verify → Deploy pages → E2E tests → Preview verify` for every branch.
  `deploy-pages` changes one folder at a time and redeploys the whole tree
  with `actions/deploy-pages`. CI runs one at a time
  (`group: ${{ github.workflow }}`, `queue: max`), so deployments never lose
  each other's changes. Differences between `main` and branches come from the
  `main` and `branch` environments' variables.
- **Verification**: A deterministic Playwright scanner (`preview-scan`) crawls
  each subsite at 320 px and 1440 px. It is the only source of merge-blocking
  findings: missing images, broken links, overflow, horizontal scrolling, and
  browser errors. A GitHub Agentic Workflow (`preview-verify`), dispatched
  only after the end-to-end tests pass on the subsite, clicks through to the
  change, checks its intent as advisory feedback, and posts the report.
  Subsites, including failing ones, are kept until their pull request closes.
- **Addresses**: A branch name becomes a flat slug. It is lowercased and every
  run of characters outside `[a-z0-9]` becomes `-`. Names longer than 63
  characters keep 54 characters plus an 8-hex SHA-256 suffix of the original
  name. `main` is reserved, and collisions are rejected explicitly.
- **Merge gate**: The `preview-verification` commit status is required on
  `main`, alongside `Verify`. There is no override.

## Justification

- All source stays in one repository, and no extra token or third-party host is
  needed.
- Subsites use the same hosting and base-path mechanism as `main`, so they
  catch the class of bug in #85: an asset URL that skips the base path.
- Merge decisions stay reproducible, because AI judgment is advisory only.
- Moving production to a dedicated release repository is tracked in #100.

See `specs/002-pr-preview-verification/research.md` (R1, R2, R4, R8) for the
alternatives considered.
