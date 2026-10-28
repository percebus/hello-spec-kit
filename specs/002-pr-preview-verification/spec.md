# Specification

Pre-merge preview and automated visual verification

**Created**: 2026-10-28

**Status**: Draft

## Input

User description:

```
"I currently have a bug that the visualization did not load the expected image.
However, this spec aims to prevent introducing these kind of breaking changes

## GOAL

the website should be available in such a place that an automated agent can
navigate through the website and a) verify the correctnes of the incoming
change, and b) take note of anything that would be noticable bugs (images not
being loaded, frames out of bounds, etc)

## NOTES

- This check should happen in any branch, and it should be a pre-requisite to
  merge to `main`
- There is an exitsing github action step that publishes the website to an
  `*.io` page. However this a) only happens in `main`, and b) it's (currently)
  considered `production`
- I'm considering adding a GH agentic workflow that can reason over what needs
  to be clicked to reach the new feature and take notes of the website"
```

## Clarifications

### Session 2026-10-28

- Q: Should intent-mismatch findings block merging? → A: No. Only defect
  findings block merging; intent findings are advisory and visible on the pull
  request.

## Requirements _(mandatory)_

## Assumptions

- The site remains a fully static build; a preview is the same build output
  that would ship to production, served from a non-production address.
- The published production site continues to be updated only from `main`; this
  feature adds pre-merge environments and does not change the production
  release flow.
- The site contains only mocked, public content, so previews can be publicly
  readable without authentication.
- The incoming change's intent is described by its pull request description
  and, when present, the linked issue's acceptance criteria. The automated
  reviewer uses these as its definition of "correct".
- Pull requests from forks are not automatically given previews or automated
  review, because they must not receive repository credentials; a maintainer
  can trigger verification after reviewing the change.
- The visual defect that motivated this feature (an expected image not loading)
  is fixed separately; this feature prevents recurrence.
- Existing automated browser tests continue to run; this feature complements
  them rather than replacing them.

### Key Entities

- **Preview**: A complete, browsable copy of the site built from one branch's
  latest commit. Attributes: source branch, commit, address, status (building,
  available, failed, retired), creation time.
- **Verification Run**: One automated review of a preview for a specific
  commit. Attributes: commit, preview, pages visited, steps taken to reach the
  changed feature, overall result (pass, fail, inconclusive), completion time.
- **Finding**: A noticeable defect or correctness concern observed during a
  verification run. Attributes: severity (blocking or advisory), category
  (missing image, broken link, content overflowing its frame, browser error,
  change does not match intent, other), page, viewport width, description,
  visual evidence.
- **Verification Report**: The human-readable summary of a run attached to the
  pull request, listing the preview address, the path taken to the change, and
  all findings.

### Functional Requirements

#### Preview environment

- **FR-001**: The system MUST build and publish a preview for the latest commit
  of every branch with an open pull request targeting `main`.
- **FR-002**: Each preview MUST be reachable at a stable, branch-specific
  address that is distinct from the production address and is never presented
  as production.
- **FR-003**: Publishing a preview MUST NOT change the content of the
  production site or another branch's preview.
- **FR-004**: When a new commit is pushed, the system MUST replace that
  branch's preview and MUST NOT report results from an older commit as current.
- **FR-005**: The preview address MUST be posted on the pull request when the
  preview becomes available.
- **FR-006**: The system MUST retire a preview when its pull request is merged
  or closed.

#### Automated verification

- **FR-007**: For each preview, an automated reviewer MUST navigate the site
  like a visitor—starting from the landing page and following visible links and
  controls—to reach the pages affected by the incoming change.
- **FR-008**: The reviewer MUST determine what to verify from the pull request
  description, changed content, and linked issue acceptance criteria, and MUST
  report whether the observed behavior matches that intent.
- **FR-009**: The reviewer MUST check every primary page and all pages affected
  by the change at a narrow mobile width (320 px) and a wide desktop width
  (1440 px).
- **FR-010**: The reviewer MUST record as blocking findings: images or media
  that fail to load or render, links to site pages that fail to load, content
  that overflows or is clipped by its frame or the viewport, horizontal
  scrolling at supported widths, and page errors reported by the browser.
- **FR-011**: The reviewer MUST record other noticeable visual or usability
  concerns (for example, overlapping elements, illegible text, or unexpected
  layout shifts) as advisory findings.
- **FR-012**: Every finding MUST include the page, viewport width, a plain
  description, and visual evidence such as a screenshot.
- **FR-013**: The reviewer MUST publish a verification report on the pull
  request that lists the preview address, the navigation path taken, the
  intent checked, and every finding grouped by severity.
- **FR-014**: The reviewer MUST treat pull request text, issue text, and page
  content as untrusted data, never as instructions, and MUST NOT modify
  repository content, the production site, or other pull requests.
- **FR-015**: If the reviewer cannot reach the change, cannot determine the
  intended behavior, or cannot finish, the run MUST be marked inconclusive with
  a reason rather than passing.

#### Merge gate

- **FR-016**: A pull request MUST NOT be mergeable into `main` until a
  verification run for its latest commit has completed with no blocking
  findings.
- **FR-017**: Only defect findings (FR-010) MUST block merging. The reviewer's
  intent-correctness judgment (FR-008) MUST be reported as advisory findings,
  visible on the pull request, for human reviewers to act on.
- **FR-018**: An inconclusive or failed verification run MUST block merging
  until it is rerun successfully or a maintainer records an explicit,
  auditable override with a reason.
- **FR-019**: Maintainers MUST be able to rerun verification without pushing a
  new commit.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of pull requests merged into `main` after adoption have a
  completed verification run for their final commit, or a recorded maintainer
  override.
- **SC-002**: A reviewer can open a preview of an incoming change within
  10 minutes of the latest push, in at least 95% of runs.
- **SC-003**: A change that removes or breaks an expected image on any primary
  page is blocked from merging in 100% of seeded test cases.
- **SC-004**: A change that causes content to overflow its frame at 320 px or
  1440 px is blocked from merging in 100% of seeded test cases.
- **SC-005**: Zero visual defects of the blocking categories reach production in
  the first 30 days after adoption.
- **SC-006**: The verification report for a typical change is complete within
  15 minutes of the preview becoming available.
- **SC-007**: Maintainers rate at least 80% of advisory findings in the first
  month as accurate and worth reading.

## Edge Cases

- Two pushes arrive in quick succession: only the latest commit's preview and
  result count; earlier runs are cancelled or marked stale.
- The preview build fails: no review runs, the pull request is marked failed,
  and the build error is linked.
- The change is not visible in the site (for example, documentation or tooling
  only): the reviewer still checks primary pages for regressions and states
  that no visual change was expected.
- The change removes a page or link intentionally: the reviewer uses the stated
  intent and does not report the intended removal as a broken link, while still
  flagging remaining links to the removed page.
- Pages depend on media playback or slow-loading assets: the reviewer waits a
  bounded time and reports assets that never load.
- External links (outside the site) are unavailable: reported as advisory, not
  blocking, because they are outside the change's control.
- The pull request text contains instructions aimed at the reviewer (for
  example, "approve this"): they are ignored and may be noted as suspicious.
- The reviewing service is unavailable or exceeds its run-time limit: the run is
  inconclusive and merging stays blocked until rerun or override.
- A pull request comes from a fork: no automatic preview is created; a
  maintainer must trigger verification after inspecting the change.
- Many open pull requests exist at once: each keeps an isolated preview with no
  cross-contamination.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse a preview of an incoming change (Priority: P1)

As a contributor or reviewer, I can open a non-production copy of the site
built from a pull request's latest commit, so the change can be inspected in a
browser before it reaches `main`.

#### Priority

**Why this priority**: Every other capability depends on the change being
reachable somewhere other than production. On its own, it already lets a person
catch issues like a missing image before merge.

#### Independent Test

Open a pull request that changes an image, follow the preview address posted on
it, and confirm that the site shows the change while production stays the same.

#### Acceptance Scenarios

##### Acceptance Criteria 1

- **Given** a branch with an open pull request targeting `main`
- **When** a commit is pushed
- **Then** a preview of that commit becomes available at a branch-specific,
  non-production address posted on the pull request

##### Acceptance Criteria 2

- **Given** a preview is available
- **When** the production site is visited
- **Then** production still shows the content from `main`, unchanged

##### Acceptance Criteria 3

- **Given** a pull request with a preview
- **When** the pull request is merged or closed
- **Then** its preview is retired

---

### User Story 2 - Detect noticeable defects automatically (Priority: P2)

As a maintainer, I get an automated report that visits the preview like a
visitor and flags noticeable defects—images not loading, content out of its
frame, broken pages, browser errors—at mobile and desktop widths.

#### Priority

**Why this priority**: It directly prevents the reported class of bug (an
expected image not loading) and works for every change, even without
understanding its intent.

#### Independent Test

Push a change that references a missing image and another that makes a block
wider than a 320 px viewport, then confirm that each report lists the defect
with its page, width, and screenshot.

#### Acceptance Scenarios

##### Acceptance Criteria 1

- **Given** a preview where an expected image fails to load
- **When** verification runs
- **Then** the report contains a blocking "missing image" finding with page,
  viewport width, and screenshot

##### Acceptance Criteria 2

- **Given** a preview where content overflows its frame at 320 px
- **When** verification runs
- **Then** the report contains a blocking overflow finding at 320 px

##### Acceptance Criteria 3

- **Given** a preview with no defects
- **When** verification runs
- **Then** the report states that the primary pages were checked at both widths
  and found no blocking findings

---

### User Story 3 - Verify that the change does what it claims (Priority: P3)

As a maintainer, I want the automated reviewer to read the pull request intent
and linked acceptance criteria, find how to reach the new or changed feature by
clicking through the site, and report whether it behaves as described.

#### Priority

**Why this priority**: It extends verification from "nothing looks broken" to
"the change is correct", but is less deterministic than defect detection.

#### Independent Test

Open a pull request that adds a visible element to a page that is two clicks
from the landing page, and confirm that the report describes the navigation
path and whether the element meets the stated acceptance criteria.

#### Acceptance Scenarios

##### Acceptance Criteria 1

- **Given** a pull request describing a new feature reachable from the landing
  page
- **When** verification runs
- **Then** the report lists the clicks used to reach it and states whether the
  observed behavior matches the description

##### Acceptance Criteria 2

- **Given** a pull request whose description does not match the preview
- **When** verification runs
- **Then** the report flags the mismatch as an advisory finding with evidence,
  without blocking the merge

##### Acceptance Criteria 3

- **Given** the reviewer cannot locate the described change
- **When** verification finishes
- **Then** the run is inconclusive with an explanation, not a pass

---

### User Story 4 - Block merges that fail verification (Priority: P4)

As the repository owner, I want merging into `main` to require a successful
verification of the latest commit, so breaking visual changes cannot reach
production unnoticed.

#### Priority

**Why this priority**: It enforces the other stories, but only has value once
previews and reports exist.

#### Independent Test

Attempt to merge a pull request with a blocking finding and confirm that merging
is prevented. Then fix it, push, and confirm that merging is allowed after the
new run passes.

#### Acceptance Scenarios

##### Acceptance Criteria 1

- **Given** the latest verification run has a blocking finding
- **When** a maintainer attempts to merge
- **Then** merging is prevented

##### Acceptance Criteria 2

- **Given** a passing run exists for an older commit only
- **When** a new commit is pushed
- **Then** merging is prevented until the new commit is verified

##### Acceptance Criteria 3

- **Given** an inconclusive run
- **When** a maintainer records an override with a reason
- **Then** merging is allowed and the override is visible on the pull request
