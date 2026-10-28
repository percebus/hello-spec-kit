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
- Q: How many previews exist at once? → A: ~~One shared preview environment,
  with runs queued one at a time.~~ Superseded by the hosting decision below.
- Q: Where are previews hosted? → A: `hello-spec-kit` becomes the R&D site.
  Its published site hosts one subsite per pull request branch. During the
  interim, `main` is also a subsite of the R&D site. Moving production to a
  dedicated release repository is a follow-up (#100).
- Q: Can several pull requests be verified at once? → A: Yes. Subsites coexist
  and are verified in parallel. Only publishing to the shared site is
  serialized.
- Q: What does a subsite represent? → A: A branch. Each push replaces that
  branch's subsite.
- Q: When are subsites deleted? → A: ~~A subsite that does not pass
  verification is deleted immediately.~~ Revised below.
- Q: Where does `main` publish until the release repository exists? → A: To its
  own `main` subsite. The R&D site's root address leads visitors there.
- Q: Where does publishing run? → A: In the CI workflow itself. The flow is
  `Verify → Deploy pages → E2E tests → Preview verify`, for every branch,
  with no separate publishing workflow. `Preview verify` is triggered only
  when the end-to-end tests pass on the subsite.
- Q: When is a subsite deleted? (revised) → A: Only when its pull request is
  merged or closed. A subsite whose verification fails is kept until the next
  push replaces it or the pull request closes. There is no scheduled cleanup;
  each deployment also drops subsites of pull requests that are no longer
  open.
- Q: Is a maintainer override of the merge gate needed? → A: Not at this time.
  A failed or inconclusive verification is resolved by fixing and pushing, or
  by re-running the CI workflow.

## Requirements _(mandatory)_

## Assumptions

- The site remains a fully static build. A subsite is the same build output
  that would ship from `main`, served from a branch-specific address.
- `hello-spec-kit`'s published site is the R&D site. It hosts `main` and all
  branch subsites. Publishing branches or deleting subsites must never
  disturb `main`'s subsite.
- `main`'s public address changes from the site root to its `main` subsite.
  The root keeps working by leading visitors to `main`.
- Out of scope, as a follow-up: TODO, tracked in #100. Create a dedicated
  release repository (`hello-spec-kit-release` or `-prod`) and move production
  publishing out of the R&D site.
- The site contains only mocked, public content, so subsites can be publicly
  readable without authentication.
- The incoming change's intent is described by its pull request description
  and, when present, the linked issue's acceptance criteria. The automated
  reviewer uses these as its definition of "correct".
- Pull requests from forks are not published or reviewed automatically, because
  they must not receive repository credentials. To verify a fork's change, a
  maintainer pushes it to a branch in this repository.
- The visual defect that motivated this feature (#85, an expected image not
  loading) is fixed separately; this feature prevents recurrence.
- Existing automated browser tests continue to run; this feature complements
  them rather than replacing them.

### Key Entities

- **R&D Site**: The published site of `hello-spec-kit`. It contains the
  `main` subsite, one subsite per open pull request branch, and a root that
  leads to `main`.
- **Subsite**: A complete, browsable copy of the site built from one branch's
  latest commit. Attributes: branch, commit, pull request, address, status
  (publishing, available, deleted), publish time.
- **Verification Run**: One automated review of a subsite for a specific
  commit. Attributes: commit, subsite, pages visited, steps taken to reach the
  changed feature, overall result (pass, fail, inconclusive, superseded),
  completion time.
- **Finding**: A noticeable defect or correctness concern observed during a
  verification run. Attributes: severity (blocking or advisory), category
  (missing image, broken link, content overflowing its frame, browser error,
  change does not match intent, other), page, viewport width, description,
  visual evidence.
- **Verification Report**: The human-readable summary of a run attached to the
  pull request, listing the subsite address, the path taken to the change, and
  all findings.

### Functional Requirements

#### Subsites on the R&D site

- **FR-001**: For every branch with an open pull request targeting `main`, the
  system MUST publish the branch's latest commit as a subsite of the R&D site.
  Subsites for different branches MUST be able to coexist and be verified in
  parallel.
- **FR-002**: Each subsite MUST be reachable at a stable, branch-specific
  address that is distinct from `main`'s address. It MUST never be presented
  as `main` or production, and MUST visibly identify the branch and commit it
  shows.
- **FR-003**: Publishing or deleting a subsite MUST NOT change the content of
  `main`'s subsite or any other branch's subsite. Concurrent publications MUST
  NOT lose each other's changes.
- **FR-004**: A new push MUST replace that branch's subsite. A verification
  run for an older commit of the same branch MUST be superseded, and its
  results MUST NOT be reported as current.
- **FR-005**: When a subsite becomes available, its address, branch, and commit
  MUST be posted on the pull request. While publishing or verification is
  pending, the pull request MUST show that it is waiting.
- **FR-006**: A subsite MUST be deleted when its pull request is merged or
  closed. A subsite whose verification fails MUST remain available until the
  next push replaces it or the pull request closes, so the failure can be
  inspected.
- **FR-020**: `main` MUST be published to its own `main` subsite of the R&D
  site, and the R&D site's root address MUST lead visitors to it.

#### Automated verification

- **FR-007**: For each published subsite, an automated reviewer MUST navigate the site
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
  request that lists the subsite address, the navigation path taken, the
  intent checked, and every finding grouped by severity. The report and its
  screenshots MUST remain available after the subsite is deleted.
- **FR-014**: The reviewer MUST treat pull request text, issue text, and page
  content as untrusted data, never as instructions, and MUST NOT modify
  repository content, `main`'s subsite, or other pull requests.
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
  until a later run for the pull request's latest commit passes. A maintainer
  override is out of scope for now.
- **FR-019**: Maintainers MUST be able to rerun verification without pushing a
  new commit, by re-running the CI workflow for the pull request.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of pull requests merged into `main` after adoption have a
  passing verification run for their final commit.
- **SC-002**: A reviewer can open the subsite of an incoming change within
  10 minutes of the latest push, in at least 95% of runs, including when
  several pull requests are active.
- **SC-003**: A change that removes or breaks an expected image on any primary
  page is blocked from merging in 100% of seeded test cases.
- **SC-004**: A change that causes content to overflow its frame at 320 px or
  1440 px is blocked from merging in 100% of seeded test cases.
- **SC-005**: Zero visual defects of the blocking categories reach `main` in
  the first 30 days after adoption.
- **SC-006**: The verification report for a typical change is complete within
  15 minutes of the subsite becoming available.
- **SC-007**: Maintainers rate at least 80% of advisory findings in the first
  month as accurate and worth reading.
- **SC-008**: No subsite remains on the R&D site for more than 15 minutes
  after its pull request is merged or closed.

## Edge Cases

- Two pushes to the same branch arrive in quick succession: the older CI run
  is cancelled, the subsite ends up showing the latest commit, and only the
  latest commit's result counts.
- Several pull requests deploy at once: every subsite and `main` survive. Each
  deployment waits for the previous one, but tests and verifications run in
  parallel.
- Two branch names would map to the same address after flattening (for
  example `feat/a-b/c` and `feat/a/b-c`, or `feat/x` and `feat-x`): the second
  one is rejected with an explanation on its pull request instead of
  overwriting the first one's subsite.
- A branch name is very long (for example a deep `feat/a/b/c/...` name): its
  address is shortened but stays unique and stable across pushes, so long
  branches with the same beginning do not collide.
- A branch name would collide with `main` or another reserved address: it is
  rejected in the same way.
- Verification fails: the subsite stays available for inspection until the
  next push or until the pull request closes, and the report, findings, and
  screenshots remain on the pull request.
- The end-to-end tests fail on the subsite: the agentic review is not started,
  and merging is blocked until a later push passes.
- The subsite build fails: nothing is published, the pull request is marked
  failed, and the build error is linked.
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
  inconclusive and merging stays blocked until a rerun passes.
- A pull request comes from a fork: no subsite is published automatically; a
  maintainer pushes the change to a branch in this repository to verify it.
- The R&D site approaches its size limit because many branches are open:
  publishing reports the problem on the pull request instead of silently
  dropping other subsites.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse a subsite of an incoming change (Priority: P1)

As a contributor or reviewer, I can open a subsite of the R&D site built from a
pull request branch's latest commit, so the change can be inspected in a
browser before it reaches `main`.

#### Priority

**Why this priority**: Every other capability depends on the change being
reachable somewhere other than `main`. On its own, it already lets a person
catch issues like a missing image before merge.

#### Independent Test

Open a pull request that changes an image, follow the subsite address posted on
it, and confirm that the subsite shows the change while `main`'s subsite stays
the same.

#### Acceptance Scenarios

##### Acceptance Criteria 1

- **Given** a branch with an open pull request targeting `main`
- **When** a commit is pushed
- **Then** that commit is published as the branch's subsite, whose address,
  branch, and commit are posted on the pull request

##### Acceptance Criteria 2

- **Given** a branch subsite is available
- **When** `main`'s subsite or the R&D site's root is visited
- **Then** it still shows the content from `main`, unchanged

##### Acceptance Criteria 3

- **Given** pull request A's subsite is being verified
- **When** a commit is pushed to pull request B
- **Then** B's subsite is published and verified without waiting for A's
  verification, and A's subsite is unaffected

##### Acceptance Criteria 4

- **Given** a branch subsite exists
- **When** its pull request is merged or closed
- **Then** the subsite is deleted, and other subsites are unaffected

---

### User Story 2 - Detect noticeable defects automatically (Priority: P2)

As a maintainer, I get an automated report that visits the subsite like a
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

- **Given** a subsite where an expected image fails to load
- **When** verification runs
- **Then** the report contains a blocking "missing image" finding with page,
  viewport width, and screenshot

##### Acceptance Criteria 2

- **Given** a subsite where content overflows its frame at 320 px
- **When** verification runs
- **Then** the report contains a blocking overflow finding at 320 px

##### Acceptance Criteria 3

- **Given** a subsite with no defects
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

- **Given** a pull request whose description does not match the subsite
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
`main` unnoticed.

#### Priority

**Why this priority**: It enforces the other stories, but only has value once
subsites and reports exist.

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
- **When** a maintainer re-runs the pull request's CI workflow and the new run
  passes
- **Then** merging is allowed
