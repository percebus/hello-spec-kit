---
description: '.github Reusable actions and workflows'
applyTo: '.github/**/*.yml'
---

# GitHub [Re-usable] actions & workflows

## Linting

`prettier` is configured with its defaults, which favor double quotes. So prefer

1. No quotes when possible
2. Double quotes when quotes are needed (prettier's default; do not override it)

## YAML over JSON

Always prioritize human readableness over compactness.

### lists

**Bad**

```yaml
foo: ["bar", "baz"]
```

**Good**

```yaml
foo:
  - bar
  - baz
```
