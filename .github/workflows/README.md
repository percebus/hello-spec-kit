# Workflows

| Workflow                                                   | Trigger                       | Purpose                                                                                                |
| ---------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| [always.yml](always.yml)                                   | Pull request, push to `main`  | CI: build and test, publish the site (or a pull request subsite), and run end-to-end tests against it. |
| [pull_request_closed.yml](pull_request_closed.yml)         | Pull request closed or merged | Deletes the pull request's subsite.                                                                    |
| [preview-verify.md](preview-verify.md)                     | CI succeeds on `main`         | Agentic: reviews `main/` against the merged stories; reopens linked issues that are not done.          |
| [issue-closed.md](issue-closed.md)                         | Issue closed                  | Agentic: audits closed issues and their sub-issues.                                                    |
| [issue-requirement-verify.md](issue-requirement-verify.md) | Daily, manual                 | Agentic: checks open `FR-`/`SC-` issues against the deployed site.                                     |

```text
pull request ──▶ CI (always.yml) ──▶ subsite /<branch-slug>/ ──▶ merge
                                                                   │
main ──▶ CI (always.yml) ──▶ /main/ ──▶ preview-verify (post-merge review)
```

- Site: https://percebus.github.io/hello-spec-kit/ (redirects to `main/`).
- Pull requests merge after the CI checks pass. The post-merge review reports
  on the pull request and its issues; it does not block merges.
- Agentic workflows (`*.md`) compile to `*.lock.yml` with `gh aw compile`.
  Commit both files and never edit a lockfile by hand.

Setup, environments, the merge-gate ruleset, secrets, and other details are in
[copilot-notes.md](copilot-notes.md). See also
[ADR-002](../../docs/ADR/002-rnd-site-subsites.md) and
`specs/002-pr-preview-verification/`.
