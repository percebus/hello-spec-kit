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
