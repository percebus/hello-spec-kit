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

## R2. Publishing runs inside the CI workflow, serialized

**Decision**: The CI workflow, `always.yml`, publishes subsites itself. A
separate `pull_request_closed.yml` deletes them. Both use the same composite
action, `.github/actions/replace-pages-artifact`:

```text
always.yml (PR):          Verify ──▶ Deploy pages ──▶ E2E tests (merge gate)
always.yml (main):        Verify ──▶ Deploy pages ──▶ E2E tests
preview-verify.md:        workflow_run (CI succeeded on main) ──▶ post-merge review
pull_request_closed.yml:  Delete subsite
```

| Event                                                  | Workflow / operation                                  |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `pull_request` opened/synchronize/reopened (same repo) | `always.yml` › `publish` the branch's subsite         |
| `push` to `main`                                       | `always.yml` › `publish` `main/`                      |
| `pull_request_target` closed (same repo)               | `pull_request_closed.yml` › `delete` the branch's subsite |

Every deployment also prunes subsites whose pull request is no longer open.
There is no scheduled cleanup.

**Concurrency**: The whole CI workflow uses `group: ${{ github.workflow }}`,
`cancel-in-progress: false`, and `queue: max`. Only one CI run executes at a
time across the repository, and every waiting run is kept in order.
Separately, the two jobs that rewrite the site, `always.yml` › `deploy-pages`
and `pull_request_closed.yml` › `delete-subsite`, share the job-level group
`pages` with `queue: max`. A delete therefore starts as soon as its pull
request closes and waits only for an in-flight deployment, not for a whole CI
run. The two must not overlap, because whichever force-pushes last would undo
the other: a lost `main/` publish, or a deleted subsite that reappears.

**Environments**: Only `verify` selects an environment:
`main` for `refs/heads/main`, otherwise `branch`. It reads `vars.SUBSITE_KIND`
(`main`|`branch`) and passes it as a job output, so later jobs need no event checks. `deploy-pages` and
`delete-subsite` use the `github-pages` environment. The only per-run check
left is same-repo (fork) detection.

**Why a separate closed workflow**: `pull_request_target` runs the default
branch's workflow with `GITHUB_REF=refs/heads/main`. That passes
`github-pages` rules without the `refs/pull/*/merge` rule, avoids depending on a
merge ref that no longer exists, and also runs for pull requests with
conflicts, which `pull_request` events skip. It never checks out PR code.

**Rationale**:

- **Simplicity.** One workflow, the same job names as before (`deploy-pages`
  and `e2e-tests`), and reruns through GitHub's "Re-run jobs".
- **No lost updates.** `deploy-pages` replaces the whole site, so each run does
  a read-modify-write of the `gh-pages` tree. With one run at a time, writes
  cannot race. `queue: max` is required because the default, `queue: single`,
  would cancel every waiting run except the newest and drop other branches'
  runs.
- **Configuration over conditions.** Behavior differences between `main` and
  branches live in environment variables the owner controls.

**Accepted trade-offs**:

- CI no longer runs pull requests in parallel or cancels superseded pushes.
  Each push runs in full, in order. The agentic `preview-verify` keeps its own
  per-PR group and still runs in parallel.
- A `pull_request` run uses the branch's own copy of the workflow, so a
  same-repo pull request could change how it publishes. Same-repo authors
  already have write access, and fork pull requests are never deployed.

**Required settings**: Environments `main` (deployment branches: `main`;
vars `SUBSITE_KIND=main`), `branch` (no restriction;
vars `SUBSITE_KIND=branch`), and `github-pages`
(deployment branches: no restriction).

**Alternatives considered**:

- _A separate `pages-publish.yml` driven by `workflow_run` and
  `pull_request_target` (previous design)_: it always ran `main`'s copy of the
  publishing logic and needed no environment change. It was rejected by the
  owner in favor of keeping `deploy-pages` and `e2e-tests` in CI.
- _Per-ref concurrency with a job-level `pages` queue (previous design)_: it
  allowed parallel CI across pull requests. It was replaced by the owner's
  simpler one-at-a-time rule.
- _Event checks (`github.event_name`) in every job_: replaced by environment
  variables at the owner's request.

## R3. Merge gate signal (FR-016, FR-018)

**Decision**: Use one **commit status** with the context
`preview-verification` on the PR head SHA. A repository ruleset on `main` makes
it required, alongside `Verify`. CI sets it to `pending` as soon as a same-repo
PR is pushed (FR-005), and `e2e-tests` sets `success` "Subsite passed
end-to-end tests" or `failure`. The post-merge review writes the same context
on the `main` commit for information only. The states are defined in
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

## R6. Post-merge review, verdict, and fallback

**Decision** (revised 2026-10-29):

- **When.** The scanner and the agent run **after a pull request merges**,
  not on every push. `preview-verify.md` triggers on `workflow_run` when CI
  completes successfully for a `push` to `main`, so `main/` has passed its
  end-to-end tests. CI doesn't dispatch it, and no `actions: write` or
  environment variable is needed. Its `resolve` job looks up the merged pull
  request with
  `GET /repos/{repo}/commits/{sha}/pulls`. Direct pushes without a pull
  request are skipped.
- **What it reviews.** `main/` at the merge commit. The PR's subsite is
  already deleted by `pull_request_closed.yml`. If `main/` moves on before
  the scan finishes, the run is superseded and posts nothing.
- **Effect.** The report goes to the merged PR and to every issue it closes.
  When the scanner has blocking findings or the agent has an intent mismatch,
  the agent reopens those issues through the `update-issue` safe output
  (FR-021). An inconclusive review only comments.
- **Scanner verdict.** The `scan` job sets `failure` when there are blocking
  findings.
- **Agent verdict.** The agent ends by calling `record-verdict`, a custom
  safe-output tool that receives `{ outcome, reason }`.
  - It sets `success` only when the scan was clean and `outcome` is
    `complete`.
  - It sets `error` when `outcome` is `inconclusive`.
  - It never overwrites `failure`.
- **Fallback.** `finalize` runs with `needs: [agent, detection, safe_outputs]`
  and `if: always()`. The installed compiler, `gh aw` v0.89.21, does not
  support `detection-gate`. It keeps the authored `if: always()`, so
  `finalize` also runs when detection or the agent fails. If the status is
  still `pending`, it sets `error` with "Inconclusive: reviewer did not record
  a verdict" (FR-015).
- **Statuses.** The scanner, `record-verdict`, and `finalize` write
  `preview-verification` on the `main` commit. It is informational, because
  nothing gates on it after the merge.

**Rationale**:

- One AI review per story instead of one per push lowers Copilot cost and
  noise, and reviews what actually shipped.
- "Closes #N" closes issues at merge. Reopening them is how the review says
  "this story is not done", which matches how `issue-closed.md` treats
  incomplete work.
- The agent never holds a write token, and crashes and timeouts fail closed.

**Implementation note**: `record_verdict` is a compiler-generated safe-output
job, so `finalize` polls the status for up to 60 seconds instead of listing it
in `needs`. Verified with `gh aw compile preview-verify --validate`.

**Alternatives considered**:

- _Reviewing on every push (previous design)_: rejected by the owner because
  of cost and noise on PRs that are still changing.
- _Reviewing on approval_: rejected because GitHub does not let authors
  approve their own pull requests. Ready-for-review, label, and slash-command
  triggers were also offered.
- _Keeping the deterministic scan on every push as a blocking check_: offered,
  and rejected by the owner in favor of moving the scan together with the
  agent. The end-to-end tests remain the pre-merge gate.
- _Deleting the subsite right away on failure (earlier design)_: rejected by
  the owner because it needed a separate dispatchable publishing workflow.
- _Parsing the PR comment_: rejected because it is fragile and open to prompt
  injection.
- _Using the workflow conclusion_: rejected because it cannot express
  "inconclusive".

## R7. Report and evidence (FR-012, FR-013)

**Decision**:

- The agent posts the same report on the merged PR and on each issue it closes
  through `add-comment` (`max: 6`: the PR plus up to five issues).
- Scanner screenshots are uploaded as artifact `preview-scan-<sha>`.
- The agent's screenshots go to `preview-agent-<sha>` through the
  `upload-artifact` safe output.
- The report heading says ✅ Done, ❌ Not done, or ⚠️ Inconclusive. When not
  done, it lists what is missing and says that the linked issues were
  reopened. When inconclusive, it explains how to rerun: re-run the `main` CI
  run for that commit.

**Rationale**: Artifacts and comments outlive the subsite. Posting on the
issues keeps the story's own history accurate. gh-aw recommends
`upload-artifact` over `upload-asset`.

**Alternatives considered**: `upload-asset` was rejected because it grows git
history.

## R8. Branch slug rules (FR-002, edge cases)

**Decision**: Derive the slug from the **branch name supplied by GitHub's event
payload**, never from artifact contents:

1. Lowercase the name.
2. Replace each run of characters outside `[a-z0-9]` with `-`.
3. Trim leading and trailing `-`.
4. If the result is longer than 63 characters, keep the first 54 characters,
   trim any trailing `-`, then append `-` and the first 8 hex characters of the
   SHA-256 of the **original** branch name.

| Branch                                                       | Slug                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| `feat/see-website`                                           | `feat-see-website`                                         |
| `feat/a/b/c`                                                 | `feat-a-b-c`                                               |
| `feat/podcast/player/keyboard/…` (more than 63 characters after flattening) | `feat-podcast-player-keyboard-…` (54 characters) + `-` + 8-hex hash |

The owner's branch convention is hierarchical (`feat/a/b/c`), so this design
has two implications:

- **The hash only applies to long names.** Two long branches with the same
  beginning get different addresses, because the hash comes from the full
  original name. The address stays the same across pushes because the hash is
  deterministic.
- **Short names can still collide after flattening.** For example, `feat/a-b/c`
  and `feat/a/b-c` both become `feat-a-b-c`, and `Feat/X` collides with
  `feat/x`. These are rare and are rejected explicitly. Keeping short
  addresses readable was chosen over always hashing.

- **Reserved names.** `main` is reserved for `main`'s subsite, so `Main` or
  `main/` on any other branch is rejected. A branch that flattens to an empty
  string (for example `///`) is also rejected. Flattening can never produce a
  slug starting with `_` or `.`, or a root file name such as `index.html` (it
  becomes `index-html`). `assertAllowed` still checks those as a defense in
  depth.
- **Collisions.** `subsites.json` records which branch owns each slug. If a
  different branch already owns the slug, the publish is rejected. The status
  becomes `error` with "Address collision with `<branch>`; rename the branch."

**Rationale**:

- One flat folder per branch keeps addresses short and makes pruning a single
  folder delete.
- The 63-character cap keeps addresses manageable. A hash suffix keeps capped
  names unique without making typical names unreadable.
- Taking the slug from trusted event data prevents a PR from targeting `main/`
  or another branch's folder by tampering with its artifact.
- Collisions are explicit instead of silently overwriting another subsite.

**Alternatives considered**:

- _Mirror the branch hierarchy as nested folders
  (`/hello-spec-kit/feat/a/b/c/`)_: Git's ref rules prevent overlaps, because
  `feat/a` and `feat/a/b` cannot coexist. However, it restricts characters in
  each name segment, needs cleanup of empty parent folders, and gives longer
  addresses. The owner chose the flat folder with a hash suffix.
- _Plain truncation to 63 characters (previous rule)_: rejected because long
  hierarchical names with the same beginning would collide.
- _Always hashed slugs_: rejected because they are unreadable.
- _PR number paths (`/pr-12/`)_: rejected because the owner chose per-branch
  subsites.

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
- `deploy-pages` writes `<slug>/preview.json`
  ([contracts/subsite-manifest.schema.json](./contracts/subsite-manifest.schema.json)).
  `e2e-tests` polls it until it reports the expected SHA.
- `e2e-tests` always writes a temporary `.env.subsite` (git-ignored) with
  `BASE_URL=https://percebus.github.io` and
  `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/<slug>`, then runs `npm test` with
  `ENV=subsite`. For `main`, the slug is `main`, which is equivalent to
  `.env.production`. One path covers both, with no environment switch.
- `.env.production` and `.env.development` both change to
  `NEXT_PUBLIC_BASE_PATH=/hello-spec-kit/main`. Each file is read by two
  consumers, and keeping both files on the same value keeps them consistent:
  - `next build` loads `.env.production`. CI's local test build and `main`'s
    build therefore both use `/main`.
  - Playwright loads `.env.${ENV}`. Local tests use `.env.development`, and
    `ENV=production` still targets the live `main` site manually. Locally, the
    site is served at `http://127.0.0.1:3000/hello-spec-kit/main/`.
- When `PREVIEW_SCAN=1`, `playwright.config.ts` skips loading dotenv and the
  gallery web server. The scanner then takes `BASE_URL` and
  `NEXT_PUBLIC_BASE_PATH` from the process environment, which is set per
  subsite.

**Rationale**:

- In Next.js, explicit process environment variables override `.env` files,
  so branch subsite builds pass their own base path.
- If only `.env.production` changed, CI's local build would use `/main` while
  local tests still expected `/hello-spec-kit`.
- No code or test hard-codes the base path, because all of them read
  `NEXT_PUBLIC_BASE_PATH`.
- `playwright.config.ts` loads `.env.${ENV}` with `override: true`, which would
  overwrite a per-subsite base path. That is why the scanner skips dotenv.
- A separate publish build for branches avoids changing the local test setup.
- The extra build takes about 1 minute, which fits SC-002.

**Alternatives considered**:

- _A separate `.env.main` for post-publish tests_: rejected because a third
  environment file duplicates `.env.production`. Keeping `.env.production` and
  `.env.development` on the same base path is simpler.
- _One build with the subsite base path that is also used for local tests_:
  rejected because it changes how test environment files work.
- _Rewriting HTML after the build_: rejected because it is brittle.

## R10. Untrusted content and forks

**Decision**:

- Same-repo pull requests are deployed by their own CI run. Closed pull
  requests are cleaned up by `pull_request_closed.yml`, which runs on
  `pull_request_target`. It uses the default branch's workflow and scripts and
  never checks out PR code.
- Fork pull requests still run `Verify`, but they get no slug, artifact,
  deployment, or verification, and their token cannot set statuses anyway.
  To verify a fork's change, a maintainer pushes it to a branch in this
  repository.

**Residual risk (accepted)**: Same-repo PR authors already have write access.
Their static files are served on the same origin as `main/`.
`percebus.github.io` has no authentication or cookies, so this is acceptable
for the R&D site. All of `percebus`'s project Pages sites share this origin,
so moving production to a release repository (#100) does not change this risk.

## R11. Rerun; no override (FR-018, FR-019)

**Decision**:

- **Rerun**: use "Re-run all jobs" on the pull request's CI run, or push a new
  commit. Either one redeploys the subsite and re-runs the end-to-end tests.
  Re-running `main`'s CI run also re-runs the post-merge review once it
  succeeds.
- **Override**: none for now. The owner decided it is unnecessary at this time.

**Rationale**: With publishing inside CI, GitHub's built-in rerun covers
FR-019 without a custom workflow.

**Alternatives considered**: A maintainer-only `preview-override.yml`
(previous design) was removed at the owner's request.

## R12. `main` during the interim (FR-020)

**Decision**:

- On pushes to `main`, `deploy-pages` publishes `main/`. `e2e-tests` then runs
  against `https://percebus.github.io/hello-spec-kit/main/` with the same
  `.env.subsite` mechanism as branches.
- The root `index.html` uses a meta refresh with a visible link to `./main/`,
  so the old URL keeps working.
- The move to a release repository is tracked in #100. When that happens, the
  root redirect and `main/` will point to the new production URL.

**Rationale**: The root URL keeps working, and `main` follows the same
`deploy-pages` → `e2e-tests` path as branches.

**Alternatives considered**: Keeping `main` at the site root was rejected by
the owner. Mixing root files with subsites also complicates pruning.

## R13. Constitution alignment

- **Principle I**: Each subsite is the same static export with a different base
  path. The root redirect is static HTML.
- **Principle II**:
  - The plan adds no npm dependencies.
  - It adds one agentic workflow and a storage branch, and extends the
    existing CI workflow. These are justified in the plan's Complexity
    Tracking.
  - It removes the need for a second repository.
- **Principle III**: The banner is semantic, readable at 320 px, meets contrast
  requirements, and does not appear on `main`.
- **Principle IV**: Browser verification becomes automatic, and console errors
  are detected.
