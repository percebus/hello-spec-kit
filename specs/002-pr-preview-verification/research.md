# Research: Pre-merge preview and automated visual verification

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-28

Each entry resolves an unknown from the plan's Technical Context. Format:
Decision / Rationale / Alternatives considered.

## R1. Hosting: subsites on `hello-spec-kit`'s own Pages site

**Decision**: Use `hello-spec-kit`'s GitHub Pages site as the **R&D site**:

```text
https://percebus.github.io/hello-spec-kit/
├── index.html        → redirects to ./main/
├── main/             → main branch (interim production; see #100)
├── <branch-slug>/    → one subsite per open same-repo PR branch
├── subsites.json     → index of slug → branch, PR, SHA
└── .nojekyll
```

- The Pages source stays **GitHub Actions**.
- The site's complete contents are stored on the `gh-pages` branch, which is
  storage only and not a Pages source.
- Every publish or delete:
  1. Changes one folder.
  2. Rewrites `gh-pages` as a **single orphan commit** with a force-push, so
     history never grows.
  3. Uploads the whole tree with `actions/upload-pages-artifact`.
  4. Publishes it with `actions/deploy-pages`.

**Rationale**:

- **One repository, no extra token.** All source stays in `hello-spec-kit`, as
  requested.
- **Whole-tree deploy.** `actions/deploy-pages` always replaces the whole site,
  so a persistent copy of the tree is needed. A storage branch is the simplest
  durable store.
- **Size.** GitHub Pages sites can be up to 1 GB. A build is about 1.3 MB
  (140 files), so the site has room for hundreds of subsites.
- **Build limit.** Publishing through a custom Actions workflow is exempt from
  Pages' soft limit of 10 builds per hour, which branch-source publishing has
  (GitHub Docs, "GitHub Pages limits").
- **No history growth.** Single-commit storage avoids accumulating copies of
  every branch build. Source history already lives in the real branches.

**Alternatives considered**:

- _Separate `hello-spec-kit-preview` repository (previous plan)_: rejected by
  the owner. Instead, production will move out to a release repository later
  (#100).
- _Use `gh-pages` as the Pages source_: rejected because of the 10
  builds-per-hour limit and the change to how production publishes.
- _Rebuild the tree from the latest artifact of every open PR_: rejected
  because artifacts expire, more API calls are needed, and races are harder to
  reason about.
- _Netlify, Vercel, or Cloudflare Pages_: rejected because they need an outside
  account and secrets.
- _Serve the site only on the runner's localhost_: rejected because people
  could not open it (User Story 1).

## R2. Publishing runs in `main`'s context, serialized

**Decision**: A single non-agentic workflow, `pages-publish.yml`, performs
every change to the R&D site. It is triggered by:

| Trigger                              | Operation                                                         |
| ------------------------------------ | ----------------------------------------------------------------- |
| `workflow_run` of CI (`completed`, `success`) | `publish` the run's artifact: a PR branch subsite or `main` |
| `pull_request_target` (`closed`)     | `delete` the branch's subsite. No PR code is checked out.          |
| `workflow_dispatch`                  | `publish` (rerun) or `delete` (after failed verification)          |
| `schedule` (hourly)                  | `prune` subsites whose PR is closed (safety net, SC-008)           |

Concurrency is set at the workflow level: `group: pages-publish`,
`cancel-in-progress: false`, and `queue: max`.

**Rationale**:

- **Deploy rules.** `workflow_run`, `pull_request_target`, `schedule`, and
  dispatches to `main` all run in the default branch context. They therefore
  satisfy the `github-pages` environment's deployment rules without loosening
  them.
- **Trusted workflow code.** The publishing logic is the version on `main`, not
  workflow code from a PR. Code a PR changes cannot rewrite how other subsites
  are published.
- **No lost updates.** Serializing read-modify-write on `gh-pages` prevents
  lost updates (FR-003). `queue: max` keeps every pending publish instead of
  the default `queue: single`, which drops all but the newest. Each publish
  takes about 1 minute, so queues stay short.
- **Parallel verification.** Verification runs outside this group (FR-001).
- **Dispatch works.** `GITHUB_TOKEN` can trigger `workflow_dispatch` runs
  (GitHub Docs, "GITHUB_TOKEN").

**Alternatives considered**:

- _Deploy from the PR's own workflow_: rejected because it requires opening
  `github-pages` deployments to every branch, and a PR could alter the publish
  logic.
- _One concurrency group per branch_: rejected because concurrent writes to
  `gh-pages` would race.

## R3. Merge gate signal (FR-016, FR-018)

**Decision**: Use one **commit status** with the context
`preview-verification` on the PR head SHA. A repository ruleset on `main` makes
it required, alongside `Verify`. CI sets it to `pending` as soon as a same-repo
PR is pushed (FR-005). The states are defined in
[contracts/commit-status.md](./contracts/commit-status.md).

**Rationale**: The required check has a stable name and shows a "waiting"
state immediately. It fails closed: if it is missing or pending, merging is
blocked. gh-aw job names are owned by the compiler, and skipped jobs count as
passing.

**Alternatives considered**:

- _Requiring gh-aw job checks_: rejected because job names are unstable and
  skipped jobs pass the check.
- _Check runs API_: rejected because it needs a GitHub App identity.

## R4. Deterministic defect scan vs. agent judgment (FR-010, FR-011, FR-017)

**Decision**: Split the reviewer into two parts:

1. **Defect scanner** (deterministic; the only blocking source): a Playwright
   project, `preview-scan`.
   - **Crawl.** It starts from the subsite's landing page and visits internal
     links under the subsite's base path at 320 px and 1440 px.
   - **Blocking findings:**
     - same-origin requests that fail or return 4xx/5xx;
     - `<img>` elements that are not `complete`, or have `naturalWidth === 0`
       after scrolling into view;
     - `MediaError` on audio or video;
     - `pageerror` events and `console.error` messages;
     - `scrollWidth > innerWidth`;
     - visible elements that extend past the viewport or are clipped by an
       `overflow: hidden|clip` ancestor.
   - **Exclusions.** It ignores elements of 1×1 px or smaller, intentional
     scroll containers, and ellipsis text.
   - **Advisory findings.** It flags external links that fail.
   - **Evidence.** It takes screenshots and writes
     [contracts/findings.schema.json](./contracts/findings.schema.json).
   - **Scope.** It treats links that leave the subsite as external, including
     links into `main/`. A missed base path therefore shows up as a defect
     instead of silently loading `main`'s assets.
2. **Agentic reviewer** (gh-aw, Copilot, `playwright-cli`): it navigates the
   subsite to the changed feature, checks the intent (advisory), records other
   visual concerns (advisory), and writes the report.

**Rationale**: Merge decisions are reproducible, and SC-003 and SC-004 can be
tested with seeded defects. No new dependencies are needed. The scoping rule
also catches the class of bug in #85: an asset URL that skips the base path.

**Alternatives considered**:

- _Agent-only review_: rejected because it is non-deterministic and cannot be
  reproduced.
- _Visual regression baselines_: rejected because they need baseline storage
  and many intended changes would show up as differences.
- _axe-core or Lighthouse_: rejected because they are new dependencies and
  outside the requested scope.

## R5. Agent sandbox, tools, and network

**Decision**: Add the gh-aw Markdown workflow `preview-verify.md` with:

- `engine: copilot`;
- `tools.playwright:` for `playwright-cli`;
- read-only `tools.github` with the `pull_requests` and `issues` toolsets;
- a `bash` allowlist of `playwright-cli:*`, `jq`, `cat`, and `ls`;
- `network.allowed: [defaults, playwright, "percebus.github.io"]`.

The prompt keeps the agent inside
`https://percebus.github.io/hello-spec-kit/<slug>/` and forbids browsing
`main/`. PR, issue, and page text is wrapped as untrusted data (FR-014), as in
`issue-closed.md`.

**Rationale**: Current gh-aw uses the built-in `playwright-cli` tool, not MCP.
Network access is limited to the domain list. The repository already uses gh-aw
and `COPILOT_GITHUB_TOKEN`.

**Alternatives considered**: A custom Playwright MCP server was rejected
because gh-aw discourages it and it would require pinning the package
manually.

## R6. Verdict, fallback, and delete-on-failure

**Decision**:

- **Scanner verdict.** The `scan` job sets `failure` when there are blocking
  findings.
- **Agent verdict.** The agent ends by calling `record-verdict`, a custom
  safe-output tool that receives `{ outcome, reason }`.
  - It sets `success` only when the scan was clean and `outcome` is
    `complete`.
  - It sets `error` when `outcome` is `inconclusive`.
  - It never overwrites `failure`.
- **Fallback.** `finalize` runs with `if: always()` and
  `detection-gate: status-only`.
  - If the status is still `pending`, it sets `error` with "Inconclusive:
    reviewer did not record a verdict" (FR-015).
  - If the final state is not `success`, it dispatches `pages-publish` with
    `op=delete`, `slug`, and `sha`, which deletes the subsite immediately
    (FR-006).

**Rationale**:

- The agent never holds a write token.
- Crashes and timeouts fail closed.
- Deletion is driven by the final state, so failed scans, inconclusive runs,
  and crashes are all handled.

**Implementation note**: Prefer `needs: [record_verdict]` for `finalize` if the
compiler allows it. Otherwise, poll the status for up to 60 seconds. Confirm
with `gh aw compile preview-verify --validate`.

**Alternatives considered**: Parsing the PR comment was rejected because it is
fragile and open to prompt injection. Using the workflow conclusion was
rejected because it cannot express "inconclusive".

## R7. Report and evidence survive deletion (FR-012, FR-013)

**Decision**:

- The agent posts one PR comment through `add-comment`.
- Scanner screenshots are uploaded as artifact `preview-scan-<sha>`.
- The agent's screenshots go to `preview-agent-<sha>` through the
  `upload-artifact` safe output.
- When the result is not `success`, the report says that the subsite was
  deleted and explains how to rerun.

**Rationale**: Artifacts and comments do not depend on the subsite existing.
gh-aw recommends `upload-artifact` over `upload-asset`.

**Alternatives considered**: `upload-asset` was rejected because it grows git
history.

## R8. Branch slug rules (FR-002, edge cases)

**Decision**: Derive the slug from the **branch name supplied by GitHub's event
payload**, never from artifact contents:

1. Lowercase the name.
2. Replace each run of characters outside `[a-z0-9]` with `-`.
3. Trim leading and trailing `-`.
4. Truncate to 63 characters.

For example, `feat/see-website` becomes `feat-see-website`.

- **Reserved names.** `main` is reserved for `main`'s subsite. Any slug
  starting with `_` or `.`, and the root files (`index.html`, `404.html`,
  `subsites.json`), are also reserved.
- **Collisions.** `subsites.json` records which branch owns each slug. If a
  different branch already owns the slug, the publish is rejected. The status
  becomes `error` with "Address collision with `<branch>`; rename the branch."

**Rationale**:

- The address is stable and readable.
- Taking the slug from trusted event data prevents a PR from targeting `main/`
  or another branch's folder by tampering with its artifact.
- Collisions are explicit instead of silently overwriting another subsite.

**Alternatives considered**:

- _PR number paths (`/pr-12/`)_: rejected because the owner chose per-branch
  subsites.
- _Hashed slugs_: rejected because they are unreadable.

## R9. Builds, base paths, and visible identity

**Decision**:

- CI keeps its existing build and local test as they are. It then builds the
  publishable site again with an explicit
  `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/<slug>` (`/hello-spec-kit/main` for
  `main`) and uploads it as artifact `site`.
- Branch builds also set `NEXT_PUBLIC_PREVIEW_PR`, `_REF`, and `_SHA`. In that
  case, `app/layout.tsx` renders a `PreviewBanner`
  (`<aside aria-label="Preview build">`) and `robots: { index: false }`.
- `main` builds leave these variables unset, so `main`'s output has no banner.
- `pages-publish` writes `<slug>/preview.json`
  ([contracts/subsite-manifest.schema.json](./contracts/subsite-manifest.schema.json))
  and polls it until it reports the expected SHA.
- `.env.production` changes to `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/main`, so
  production end-to-end tests target `main/`.

**Rationale**:

- In Next.js, explicit process environment variables override `.env` files.
- `playwright.config.ts` loads `.env.${ENV}` with `override: true`, so local
  tests keep their own base path.
- A separate publish build avoids changing the local test setup.
- The extra build takes about 1 minute, which fits SC-002.

**Alternatives considered**:

- _One build with the subsite base path that is also used for local tests_:
  rejected because it changes how test environment files work.
- _Rewriting HTML after the build_: rejected because it is brittle.

## R10. Untrusted content and forks

**Decision**:

- `pages-publish` never runs code from a PR. It only copies the artifact's
  files into a folder, using event-derived slug, PR, and SHA values.
- Fork PRs are skipped when `workflow_run.head_repository` is not this
  repository. Their CI token cannot set statuses anyway.
- A maintainer can publish and verify a fork PR after reviewing it, using
  `workflow_dispatch` with `op=publish` and `pr_number=N`.

**Residual risk (accepted)**: Same-repo PR authors already have write access.
Their static files are served on the same origin as `main/`.
`percebus.github.io` has no authentication or cookies, so this is acceptable
for the R&D site. All of `percebus`'s project Pages sites share this origin,
so moving production to a release repository (#100) does not change this risk.

## R11. Override and rerun (FR-018, FR-019)

**Decision**:

- **Rerun**: dispatch `pages-publish.yml` with `op=publish` and `pr_number=N`.
  - It finds the latest successful CI run for the PR head SHA and republishes
    its `site` artifact. This recreates the subsite if it was deleted.
  - It then dispatches `preview-verify`.
  - If the artifact has expired, it reports that the PR needs a re-run of CI.
- **Override**: `preview-override.yml`, triggered by `workflow_dispatch` with
  `pr_number` and `reason`.
  - It requires the actor to have `admin` or `maintain` permission.
  - It sets `success` with "Override by @actor: reason" and posts a PR comment.
  - It does not republish anything.

**Rationale**: Reruns and overrides are explicit and auditable, and they reuse
the existing publish path.

## R12. `main` during the interim (FR-020)

**Decision**:

- When CI succeeds on `main`, `pages-publish` publishes to `main/`.
- It then runs the existing production end-to-end job against
  `https://percebus.github.io/hello-spec-kit/main/`. This job moves from
  `always.yml` into `pages-publish`.
- The root `index.html` uses a meta refresh with a visible link to `./main/`,
  so the old URL keeps working.
- The `deploy-pages` and `e2e-tests` jobs are removed from `always.yml`.
- The move to a release repository is tracked in #100. When that happens, the
  root redirect and `main/` will point to the new production URL.

**Rationale**: The root URL keeps working, `main` follows the same publishing
path as branches, and a single workflow owns the Pages site.

**Alternatives considered**: Keeping `main` at the site root was rejected by
the owner. Mixing root files with subsites also complicates pruning.

## R13. Constitution alignment

- **Principle I**: Each subsite is the same static export with a different base
  path. The root redirect is static HTML.
- **Principle II**:
  - The plan adds no npm dependencies.
  - It adds a publish workflow, an agentic workflow, an override workflow, and
    a storage branch. These are justified in the plan's Complexity Tracking.
  - It removes the need for a second repository.
- **Principle III**: The banner is semantic, readable at 320 px, meets contrast
  requirements, and does not appear on `main`.
- **Principle IV**: Browser verification becomes automatic, and console errors
  are detected.
