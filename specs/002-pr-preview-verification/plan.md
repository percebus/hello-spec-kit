# Implementation Plan: Pre-merge preview and automated visual verification

**Branch**: `feat/see-website` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-pr-preview-verification/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

`hello-spec-kit`'s GitHub Pages site becomes the **R&D site**. Each open
same-repo PR branch gets its own subsite at
`https://percebus.github.io/hello-spec-kit/<branch-slug>/`. During the interim,
`main` lives at `…/main/`, and the root redirects there. Moving production to a
release repository is tracked in #100.

**Publishing**: The CI workflow, `always.yml`, runs
`VARIABLES → Verify → Deploy pages → E2E tests` for every branch. When it succeeds on
`main`, `preview-verify.md` starts the post-merge review on `workflow_run`.

- `verify` is an isolated build and test job; it publishes nothing.
- `main` versus branch behavior comes from the `VARIABLES` job's `kind` output
  (`github.ref_name == 'main' && 'main' || 'branch'`).
- `deploy-pages` (skips forks) builds the subsite with its base path. It
  stores the site tree as one orphan commit on a `gh-pages`
  storage branch, replaces or deletes one folder, and republishes the whole
  tree with `actions/deploy-pages`.
- `e2e-tests` runs the existing test suite against the deployed subsite. For
  PRs, its result is the merge gate.
- `pull_request_closed.yml` deletes a closed PR's subsite.
- CI concurrency is per ref (`group: ${{ github.ref }}-${{ github.workflow }}`,
  `cancel-in-progress: true`). Only `deploy-pages` is serialized, through the
  job-level group `pages` with `queue: max`.

**Post-merge verification** (after `main/` passes its end-to-end tests):

1. A **deterministic Playwright scanner** checks `main/` at 320 px and
   1440 px. It is the only source of blocking findings.
2. A **gh-aw Copilot agent** uses `playwright-cli` to click through to the
   change and checks the merged PR's intent and linked acceptance criteria.
3. The report goes to the merged PR and to every issue it closes. When a
   blocking finding or an intent mismatch shows the stories are not done,
   those issues are reopened.

**Merge gate and cleanup**:

- A single required commit status, `preview-verification`, gates merges. Its
  value is `success` when the subsite passes its end-to-end tests. There is no
  override. Reruns use GitHub's "Re-run all jobs".
- Subsites stay until their PR closes, including failing ones, so failures can
  be inspected. Each deployment also prunes subsites of PRs that are no longer
  open.

See [research.md](./research.md) for the decisions and the alternatives
considered.

## Technical Context

**Language/Version**: TypeScript 7 and Node 24 for the scanner, slug helper,
and banner. GitHub Actions YAML and gh-aw Markdown compiled with `gh aw`
v0.89.21 or later.

**Primary Dependencies**: Existing dependencies only: Next.js 16 static export,
`@playwright/test` 1.63, `dotenv`, GitHub Pages (`actions/upload-pages-artifact`
and `actions/deploy-pages`, already in use), and gh-aw with the Copilot engine
and built-in `playwright` tool. There are **no new npm dependencies** and no
new repositories or secrets.

**Storage**: The `gh-pages` storage branch, holding a single orphan commit of
the site tree, plus commit statuses and workflow artifacts. See
[data-model.md](./data-model.md).

**Testing**: The Playwright `preview-scan` project and slug-rule cases. The
existing `npm test` suite is unchanged. Production end-to-end tests move to run
after publishing `main`. Checks also include `npm run format` and
`gh aw compile --validate`. See [quickstart.md](./quickstart.md).

**Target Platform**: GitHub-hosted `ubuntu-latest` runners and the GitHub Pages
project site `percebus.github.io/hello-spec-kit/`.

**Project Type**: Static website with CI/CD automation.

**Performance Goals**:

- A subsite is available within 10 minutes of a push when no other deployment
  is queued (SC-002). Only deployments wait for each other.
- The report is ready within 15 minutes after that (SC-006).
- The scan takes 5 minutes or less for about 26 pages at 2 widths.
- Cleanup finishes within 15 minutes (SC-008).

**Constraints**:

- The Pages site can be at most 1 GB; at about 1.3 MB per build, that is
  hundreds of subsites.
- A Pages deployment can take at most 10 minutes.
- At most 100 publish requests can be pending.
- Fork PRs are not processed automatically.
- The agent can reach only `percebus.github.io` and only within its subsite.
- Nothing from the scanner or agent blocks merges; they run after the merge
  (FR-017). Their findings act by reopening linked issues (FR-021).

**Scale/Scope**: One repository, a few open PRs at a time, and about 26 pages
per subsite.

All former unknowns are resolved in [research.md](./research.md), sections R1
to R12.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle / Constraint                         | Assessment                                                                                                                                                       | Result               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| I. Static-Only Delivery                        | Each subsite and `main/` is the same `output: "export"` build with a different base path. The root redirect is static HTML. There is no server runtime.        | ✅ Pass              |
| II. Simplicity First                           | No npm dependencies, repositories, or secrets are added. The plan adds workflows and a storage branch; see Complexity Tracking.                               | ✅ Pass (justified)  |
| III. Accessible & Responsive                   | The banner is a semantic `<aside>`, wraps at 320 px, meets WCAG 2.2 AA contrast, and is absent on `main`. The redirect page has a visible link. The scanner enforces 320 px and 1440 px. | ✅ Pass |
| IV. Verifiable in the Browser                  | Browser verification becomes automatic and gates merges. Console errors are detected. The spec requests these automated checks.                              | ✅ Pass              |
| Tech: no secrets in client code                | The preview variables are public: PR number, branch, and SHA. The `GITHUB_TOKEN` write permissions are used only in non-PR-code workflows.                    | ✅ Pass              |
| Tech: Python/uv dev-only                       | Not involved.                                                                                                                                                    | ✅ N/A               |
| Workflow: PR merge after browser verification  | Enforced by the merge gate.                                                                                                                                      | ✅ Pass              |
| Governance: deviations justified               | See Complexity Tracking. Next.js predates this feature (ADR-001) and is not expanded.                                                                            | ✅ Pass              |

**Post-design re-check (after Phase 1)**: All gates still pass.

- The design adds no runtime state to the site.
- Writes are limited to CI's `deploy-pages` job (site tree and deploy),
  commit statuses, and PR comments.
- The only change to the shipped site is the banner, which appears only when
  the preview variables are set, and the base path `/hello-spec-kit/main`.

## Project Structure

### Documentation (this feature)

```text
specs/002-pr-preview-verification/
├── spec.md
├── plan.md                           # This file
├── research.md                       # Phase 0
├── data-model.md                     # Phase 1
├── quickstart.md                     # Phase 1
├── contracts/                        # Phase 1
│   ├── commit-status.md
│   ├── findings.schema.json
│   ├── subsite-manifest.schema.json
│   ├── subsites-index.schema.json
│   ├── verification-report.md
│   └── workflows.md
├── checklists/requirements.md
└── tasks.md                          # Phase 2 (/speckit-tasks), not created here
```

### Source Code (repository root)

```text
.github/workflows/
├── always.yml                 # verify (isolated) → deploy-pages (build + publish; skips forks) → e2e-tests (vs subsite; PR gate)
├── pull_request_closed.yml    # NEW pull_request_target closed → delete the branch's subsite (shares job-level group `pages` with deploy-pages)
├── preview-verify.md          # NEW gh-aw, workflow_run after CI succeeds on main: resolve → scan main/ → agent → comment on PR + closing issues, reopen if not done → record-verdict → finalize
├── preview-verify.lock.yml    # NEW, generated by `gh aw compile` (do not hand-edit)
└── README.md                  # + R&D site layout, environments, rerun, link to #100

.github/actions/
└── replace-pages-artifact/
    └── action.yml             # NEW composite action: publish/delete a subsite, prune, deploy, PR comment

.github/pages/                 # NEW CI-only R&D site tooling (not part of the app)
├── branch-slug.mjs            # slug rule (research R8)
├── pages-tree.mjs             # upsert/remove/prune a subsite in a checked-out gh-pages tree; maintains subsites.json
└── root/
    └── index.html             # root redirect → ./main/ (with visible link)

app/
├── layout.tsx                 # PreviewBanner + robots noindex when NEXT_PUBLIC_PREVIEW_* set
└── components/
    └── preview-banner.tsx     # NEW

tests/
├── preview/                   # NEW Playwright project "preview-scan" (only when PREVIEW_SCAN=1)
│   ├── defects.spec.ts        # crawl subsite at 320/1440 → findings.json + screenshots
│   └── banner.spec.ts         # banner shows expected PR/ref/sha (FR-002)
├── unit/                      # NEW Playwright project "unit" (no browser)
│   ├── branch-slug.spec.ts    # NEW slug cases (reserved, hash suffix for long names, collisions)
│   └── pages-tree.spec.ts     # NEW tree operations (conditional delete, collision, size cap, prune)
└── helpers/
    └── preview-scan.ts        # NEW crawl + image/media/overflow/error collectors + findings writer

.env.local                     # developer-local URL and web server settings
.env.main                      # main E2E settings
.env.development               # separate SIT deployment profile
.env.production                # separate production profile
playwright.config.ts           # + "unit" project; + "preview-scan" project and no dotenv/gallery when PREVIEW_SCAN=1
docs/ADR/002-rnd-site-subsites.md  # NEW record of R1, R2, R4, R8; links #100
README.md                      # + "Pull request subsites" section; production URL now …/main/
```

**Structure Decision**: Keep the existing single-project layout and the
existing CI workflow. Its `deploy-pages` and `e2e-tests` jobs now run for every
branch. The scanner is a Playwright project that reuses the existing
configuration and JUnit reporting. The agentic logic follows the
`issue-closed.md` pattern.

## Follow-ups

- **TODO (#100)**: Create `hello-spec-kit-release` (or `-prod`) and move
  production publishing there. When it lands:
  - The R&D root and `main/` redirect to the new production URL.
  - Production end-to-end tests target the new URL.
  - `hello-spec-kit` keeps only R&D subsites.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation                                                              | Why Needed                                                                                                                               | Simpler Alternative Rejected Because                                                                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `gh-pages` storage branch plus serialized CI                           | `deploy-pages` replaces the whole site, so coexisting subsites need a persistent tree and serialized read-modify-write (FR-001, FR-003). | Using the branch as the Pages source has a 10-builds-per-hour limit. Rebuilding from artifacts is racy and artifacts expire. A second repository was rejected by the owner. |
| Agentic reviewer (gh-aw and Copilot)                                   | FR-007 and FR-008 require reasoning about what to click to reach an arbitrary new feature and whether it matches intent.                 | Deterministic tests cannot infer intent or navigation for features that do not exist yet.                                                  |
| One commit status orchestrated across workflows                        | A stable required check, a visible waiting state, and fail-closed inconclusive runs are needed (FR-005, FR-016 to FR-018).                | Required gh-aw job checks count skipped runs as passing.                                                                                   |
