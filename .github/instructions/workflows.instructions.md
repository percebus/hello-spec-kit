---
description: '.github Reusable actions and workflows'
applyTo: '.github/**/*.yml'
---

# GitHub [Re-usable] actions & workflows

## Linting

`prettier` is configured. So prefer

1. No quotes when possible
2. Single quotes over double quotes

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
