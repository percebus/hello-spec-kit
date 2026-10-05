# HISTORY

## Setup

1. `$> pyenv local 3.14.8`
1. ~~`$> uv init`~~
1. `$> uv tool install specify-cli`
  1. Copied `specify-cli` to `requirements.uv.tool.txt`

## Tutorial

[The ONLY guide you'll need for gitHub Spec Kit](https://www.youtube.com/watch?v=a9eR1xsfvHg)

### Scaffold

1. `$> specify podsite`
1. Options chosen: "GitHub Copilot" and "Powershell"

Created nested `podsite/`

#### Fix

1. Moved `.github/` and `.specify/` to root

### Constitution

1. Backup `/constitution` prompt
1. Use prompt to extend `constitution.md`

> [!NOTE]
> There is now a `/speckit-constitution` command that wasn't there before

### Specify

> [!WARNING]
> `/specify` is now `/speckit-specify` to avoid name collition.

1. Backed up the prompt uder `/specify`
1. Ran the prompt

#### spec/001: Modern podcast stie

1. Backed up prompt under `/clarification`
1. Ran `/clarification` against spec.

#### Backlog

1. Backed up prompt under `/backlog`
1. Created backlog from spec
1. Amended nested issues

#### NOTES

- It's weird that a User Story has 1+ ACs. How do we know when it's "DONE"?
- I broke each AC into separate "Issues", and they seem to be big enough to be its own User Story.
- I ended up moving around: **Features**, **Functional Requirements** and **Measurable Outcomes** to where it made more sense.

### Scaffold

Not part of the tutotial, but I basically created an ADR from the prompt in the video stating the tech-stack and used that to scaffold the initial commit.
