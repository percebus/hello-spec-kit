---
description: 'Lint TypeScript'
applyTo: 'app/**/*.ts, tests/**/*.ts, features/steps/**/*.ts'
---

# typescript.instructions.md

## Guidance

- The project uses `next` dependencies. And `npm` scripts.
- When you make changes, ensure to run `npm run format` to maintain code style consistency.
  - Address issues promptly
- Once you've completed a stage of changes, run `npm test` to execute tests and ensure everything is functioning correctly.

## NextJS app

- `app/`: Source code.
- `tests/`: Unit tests.
- `features/`: BDD tests

## Quality

### npm scripts

Run `npm run {task name}`

| Task Name | Description |
| - | - |
| `lint` | Lints the code (i.e. `prettier`). |
| `format` | Formats the code (i.e. `prettier`). |
| `test` | Runs the tests (i.e. `playwright`). |
| `build` | `next build` |
| `dev` | `next dev` |

To get a full list, run `npm run`.

Also, see `package.json` for more details.

### tools

- `prettier`: See `.prettier*`.
- `playwright`: See `playwright.config.ts`.
- `typescript`: See `tsconfig*`.
