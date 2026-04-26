# TemplateGoblin — CLAUDE.md

## What is this?

Open-source PDF template engine. Non-technical users design templates in a visual UI,
developers use the npm library to generate PDFs at scale.

## Architecture

- Monorepo with Turborepo + pnpm workspaces
- `packages/types` — shared TypeScript types (template schema, input JSON, errors)
- `packages/core` — `template-goblin` npm library (pure TS, zero UI deps)
- `packages/ui` — `template-goblin-ui` React + Vite app

## Hard Rules

1. `packages/core` MUST have zero UI dependencies — pure Node.js/TypeScript only
2. `packages/ui` MUST NOT be imported by `packages/core`
3. All shared types live in `packages/types` — never duplicate type definitions
4. No `any` types — strict TypeScript everywhere
5. Every public function has JSDoc comments
6. Every dependency must be justified with a comment in package.json
7. No large icon libraries — use inline SVGs only
8. Code implements specs — not the other way around. If spec is ambiguous, clarify.
9. Tests are written from specs, not from code.
10. All text/images/tables render inside their bounding rectangle — NEVER overflow.

## Tech Stack

| Part              | Choice                           |
| ----------------- | -------------------------------- |
| UI Framework      | React 18 + Vite                  |
| Canvas            | Fabric.js v6                     |
| PDF Engine        | PDFKit                           |
| State Management  | Zustand (persisted to IndexedDB) |
| Shared Types      | packages/types                   |
| Testing (core)    | Jest                             |
| Testing (UI unit) | Vitest                           |
| Testing (UI e2e)  | Playwright                       |
| Monorepo          | Turborepo + pnpm                 |
| Linting           | ESLint + Prettier                |

## File Format

`.tgbl` = ZIP archive internally (see spec 001)

## Import Rules

- Always import types from `@template-goblin/types`
- Never import from `packages/core/src/...` — use `template-goblin` package name
- Never import from feature subfolders directly — use index.ts barrel exports

## Agent Roles

### Dev Agent

- **Model**: Claude Opus (max reasoning effort)
- **Reads**: spec files, journey files, CLAUDE.md
- **Writes**: source code, unit tests
- **Rule**: Code must implement what the spec says — no creative deviation

### Reviewer Agent

- **Model**: Claude Opus (max reasoning effort)
- **Reads**: spec files, journey files, code diffs
- **Checks**: spec compliance, edge cases, error handling, type safety, CLAUDE.md rules
- **Rule**: Never fixes code — only reviews and comments

### QA Agent

- **Model**: Claude Opus (max reasoning effort)
- **Reads**: spec files, journey files — never reads implementation code for test design
- **Writes**: E2E tests (Playwright for UI), integration tests (Jest for core)
- **Rule**: Tests verify behaviour from specs, not implementation details

## Workflow

```
Spec written → Dev implements → Reviewer reviews
                                    ↓
                              ❌ feedback → Dev fixes → Reviewer re-reviews
                              ✅ approved → QA writes tests → QA runs tests
                                                                ↓
                                                          ❌ failures → Dev fixes → QA re-runs
                                                          ✅ all pass → Feature complete
```

## Git Conventions

- **Branch naming**: `feature/<issue-or-spec>-<short-name>` (e.g., `feature/25-26-sidebar-sync-and-properties-matrix`)
- **Commit format**: Conventional commits — `feat:`, `fix:`, `spec:`, `docs:`, `chore:`, `test:`
- **Pre-commit hook**: ESLint + Prettier on staged files (via `lint-staged`)
- **Pre-push hook**: Mirrors CI — types build, type-check, lint, core + UI unit tests, full build
- **Merge style**: `--merge` (no squash); one branch per GitHub issue
- **Never force push to main**

## Commands

- `pnpm install` — install all dependencies
- `pnpm build` — build all packages (types → core → ui)
- `pnpm type-check` — TypeScript type checking across all packages
- `pnpm lint` — ESLint check
- `pnpm test` — run unit tests (Jest in core, Vitest in ui)
- `pnpm test:e2e` — run Playwright tests (ui)
- `pnpm dev` — start UI dev server (port 4242)

## Spec Status Tracking

Specs live in `specs/` — each follows the template in prompt.md Part 8.
Journeys live in `journeys/` — each follows the template in prompt.md Part 9.

## Open work

Bug reports, planned features, and follow-up cleanups are tracked as
[GitHub issues](https://github.com/JaiminPatel345/template-goblin/issues).
Keep that the source of truth — don't list bug status in this file.
