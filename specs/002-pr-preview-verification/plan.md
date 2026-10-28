# Implementation Plan: Pre-merge preview and automated visual verification

**Branch**: `feat/see-website` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-pr-preview-verification/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Every same-repo pull request into `main` is built as the static site and
deployed to one shared preview. The preview is a GitHub Pages site in a
dedicated `percebus/hello-spec-kit-preview` repository, so production is never
touched. Runs wait in a first-in, first-out queue implemented with a GitHub
Actions concurrency group that uses `queue: max`. A staleness guard skips
superseded and closed PRs.

While a run holds the preview:

1. A **deterministic Playwright defect scanner** crawls the preview at 320 px
   and 1440 px. It is the only source of blocking findings. It catches missing
   images, broken pages, overflow, horizontal scrolling, and browser errors.
2. A **gh-aw agentic reviewer** using Copilot and `playwright-cli` reads the PR
   and its linked acceptance criteria. It clicks through the site to the
   change, checks intent as advisory feedback, and posts the verification
   report.

A single required commit status, `preview-verification`, gates merges. Only a
clean scan plus a completed review, or an audited maintainer override, can set
it to `success`. See [research.md](./research.md) for the decisions behind
this design.

## Technical Context

**Language/Version**: TypeScript 7 with Node 24 for the scanner and preview
banner. GitHub Actions YAML and a gh-aw Markdown workflow compiled with
`gh aw` v0.89.21 or later.

**Primary Dependencies**: Existing dependencies only: the Next.js 16 static
export, `@playwright/test` 1.63, `dotenv`, GitHub Pages, and gh-aw with the
Copilot engine and built-in `playwright` CLI tool. There are **no new npm
dependencies**.

**Storage**: There is no database. State is kept in commit statuses, workflow
artifacts, the concurrency queue, and the preview repository's `gh-pages`
branch. See [data-model.md](./data-model.md).

**Testing**: The Playwright `preview-scan` project is used for CI and seeded
defect PRs. The existing `npm test` suite is unchanged. Checks also include
`npm run format`, which runs Prettier and `tsc`, and
`gh aw compile --validate`. Validation steps are in
[quickstart.md](./quickstart.md).

**Target Platform**: GitHub-hosted `ubuntu-latest` runners. The preview is
served at `https://percebus.github.io/hello-spec-kit-preview/`, and production
remains at `https://percebus.github.io/hello-spec-kit/`.

**Project Type**: Static website with CI/CD automation.

**Performance Goals**: When the queue is empty, the preview should be
available within 10 minutes of a push (SC-002). The report should be complete
within 15 minutes after that (SC-006). The scan should take 5 minutes or less
for about 26 pages × 2 widths.

**Constraints**:

- Only one preview slot exists.
- GitHub Actions allows up to 100 pending runs per concurrency group.
- Fork PRs are not processed automatically.
- No secrets may appear in client code or the agent sandbox.
- The agent can reach only `percebus.github.io`.
- Only scanner findings can block merges (FR-017).

**Scale/Scope**: One repository, a few open PRs at a time, and about 26 static
pages: landing, episodes, 20 episode pages, about, and FAQ.

All former unknowns are resolved in [research.md](./research.md):

- preview hosting: R1
- queueing: R2
- merge-gate signal: R3
- blocking versus advisory split: R4
- agent sandbox: R5
- verdict channel: R6
- evidence: R7
- preview identification: R8
- fork and secret handling: R9
- override and rerun: R10

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle / Constraint                         | Assessment                                                                                                                                                                                      | Result         |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| I. Static-Only Delivery                        | The preview uses the same `output: "export"` build with a different base path. It adds no server runtime. The banner is static markup rendered at build time.                                    | ✅ Pass        |
| II. Simplicity First                           | It adds no npm dependencies and reuses Playwright and gh-aw, which the repository already uses. It adds a preview repository, an agentic workflow, and an override workflow; see Complexity Tracking. | ✅ Pass (justified) |
| III. Accessible & Responsive                   | The banner uses `<aside aria-label="Preview build">`, wraps at 320 px, meets WCAG 2.2 AA contrast, and is absent in production. The scanner enforces checks at 320 px and 1440 px.                 | ✅ Pass        |
| IV. Verifiable in the Browser                  | This feature automates browser verification and adds console-error detection. The spec explicitly requests the automated tests.                                                                  | ✅ Pass        |
| Tech: no secrets in client code                | Preview variables contain only the public PR number, branch, and SHA. `PREVIEW_PAGES_TOKEN` exists only in the `deploy` job.                                                                    | ✅ Pass        |
| Tech: Python/uv dev-only                       | Not involved.                                                                                                                                                                                   | ✅ N/A         |
| Workflow: Conventional Commits; PR merge after browser verification | The merge gate enforces browser verification before merging.                                                                                                                  | ✅ Pass        |
| Governance: deviations justified               | See Complexity Tracking. Next.js predates this feature (ADR-001) and is not expanded.                                                                                                           | ✅ Pass        |

**Post-design re-check (after Phase 1)**: All gates still pass. The data model
adds no runtime state to the site. The contracts confine writes to commit
statuses, PR comments, and the preview repository. The only shipped-site change
is the banner, which appears only when preview variables are set.

## Project Structure

### Documentation (this feature)

```text
specs/002-pr-preview-verification/
├── spec.md
├── plan.md                         # This file
├── research.md                     # Phase 0
├── data-model.md                   # Phase 1
├── quickstart.md                   # Phase 1
├── contracts/                      # Phase 1
│   ├── commit-status.md
│   ├── findings.schema.json
│   ├── preview-manifest.schema.json
│   ├── verification-report.md
│   └── workflows.md
├── checklists/requirements.md
└── tasks.md                        # Phase 2 (/speckit-tasks), not created here
```

### Source Code (repository root)

```text
.github/workflows/
├── always.yml                 # + preview-enqueue job (pending "Queued" status)
├── preview-verify.md          # NEW gh-aw: resolve → build → deploy → scan → agent → record-verdict/finalize
├── preview-verify.lock.yml    # NEW, generated by `gh aw compile` (do not hand-edit)
├── preview-override.yml       # NEW maintainer override (FR-018)
└── README.md                  # + setup: preview repo, PREVIEW_PAGES_TOKEN, ruleset, rerun/override

app/
├── layout.tsx                 # render PreviewBanner + robots noindex when NEXT_PUBLIC_PREVIEW_* set
└── components/
    └── preview-banner.tsx     # NEW

tests/
├── preview/                   # NEW Playwright project "preview-scan" (excluded from default npm test)
│   ├── defects.spec.ts        # crawl + blocking/advisory checks at 320/1440 → findings.json + screenshots
│   └── banner.spec.ts         # banner shows expected PR/ref/sha (FR-002)
└── helpers/
    └── preview-scan.ts        # NEW crawl, image/media/overflow/error collectors, findings writer

.env.preview                   # NEW BASE_URL=https://percebus.github.io, NEXT_PUBLIC_BASE_PATH=/hello-spec-kit-preview
playwright.config.ts           # + "preview-scan" project, only registered when ENV=preview or PREVIEW_SCAN=1;
                               #   skip gallery webServer for that project
docs/ADR/002-shared-pr-preview.md  # NEW record of R1–R4 decisions
README.md                      # + short "Pull request previews" section linking workflows README
```

**Structure Decision**: Keep the existing single-project layout: `app/` for the
static site, `tests/` for Playwright, and `.github/workflows/` for automation.
The scanner is a Playwright project, so it reuses the existing configuration,
`.env.${ENV}` loading, and JUnit reporting. Agentic logic stays in one gh-aw
Markdown workflow, following the `issue-closed.md` pattern.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation                                                              | Why Needed                                                                                                          | Simpler Alternative Rejected Because                                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Second repository plus `PREVIEW_PAGES_TOKEN` for preview hosting       | A non-production address on the same host type is needed (FR-002, FR-003).                                         | A repository has only one Pages deployment, so a production subpath would overwrite production. Third-party hosts add an external account and secrets. |
| Agentic reviewer (gh-aw and Copilot)                                   | FR-007 and FR-008 require reasoning about what to click to reach an arbitrary new feature and whether it matches intent. | Deterministic tests cannot infer intent or navigation for features that do not exist yet.                                  |
| Orchestrating one commit status across jobs, plus an override workflow | A stable required-check name, a visible queued state, fail-closed behavior for inconclusive runs, and auditable overrides are needed (FR-005, FR-016 to FR-018). | Requiring compiler-generated gh-aw job checks would make stale runs count as "skipped", which passes. Ruleset bypass does not record a reason. |
