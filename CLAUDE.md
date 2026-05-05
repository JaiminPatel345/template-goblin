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
11. **No source file (.ts/.tsx) may exceed 300 lines.** When a file approaches
    the cap, split by responsibility: extract sub-components, hooks, or pure
    helpers into their own files. Reuse aggressively — duplicated code across
    files is a smell. Test files are exempt; generated code is exempt. When
    you touch an existing oversized file, split it as part of the same change
    rather than adding more lines on top.
12. **Every push must include a Changeset — generated _at push time_, not
    per commit.** Make as many commits as you want without a changeset.
    When the user says "push" (or otherwise authorises a push), THAT is
    the trigger to: (a) run `pnpm changeset` for the work being pushed,
    (b) commit the generated `.changeset/*.md` file as the final commit
    on the branch, then (c) `git push`. One changeset summarises the whole
    branch's user-visible impact. The only exceptions: pure documentation
    edits to non-published files (e.g. `CLAUDE.md`, repo `README.md`) and
    changes to private packages (root `package.json`, `examples/`). When
    in doubt, add the changeset.
13. **Never add Claude (or any AI) attribution to commits.** No
    `Co-Authored-By: Claude…` trailer, no `🤖 Generated with Claude Code`
    footer in commit messages or PR bodies, no `Authored-By: claude…`.
    Commit messages stay tool-free and read as if a human wrote them.
    Same rule for PR descriptions.
14. **Every major version bump must be reflected in git.** When
    `pnpm changeset version` produces a `MAJOR` bump on any published
    package (e.g. `template-goblin` 1.x → 2.0.0), the version-bump
    commit MUST be followed by an annotated git tag matching the new
    version (`git tag -a v2.0.0 -m "v2.0.0"`) AND a GitHub Release
    (`gh release create v<n>.0.0 --generate-notes`) so the new major is
    discoverable from the GitHub UI and from `git tag --list`. Tag
    AFTER pushing the version commit; never tag a local-only commit.
    Minor and patch bumps don't require this — tag only on majors.
15. **Do exactly what is asked — nothing more.** If the user says
    "add a comment", add the comment and stop. Do not also branch,
    code, refactor, or kick off the next obvious step on your own.
    When in doubt about whether the next action is in scope, ask.
    Auto mode means execute requested actions immediately; it does
    NOT mean proactively expand the request. Reading and quick
    investigation tied to the asked task are fine; writing code,
    creating branches, opening issues/PRs, or any side effect beyond
    the explicit ask is not.
16. **Run master QA only when explicitly asked.** Do NOT auto-spawn
    a master-QA subagent before pushing, before `gh pr create`, or
    as part of any standard workflow. Push and open PRs directly
    when asked. Master QA runs only when the user types something
    like "run master QA", "QA this", or otherwise explicitly
    requests it. This supersedes any earlier guidance that placed
    master QA on the default path.

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
