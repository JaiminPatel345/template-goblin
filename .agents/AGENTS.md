# Branching and PR Strategy

- All feature work must be merged into the `dev` branch via Pull Requests.
- Never raise a PR directly against `main` for feature work.
- The `main` branch can only be updated by raising a PR from the `dev` branch.
- Never merge directly into the `main` branch.

- When raising a PR, always write the PR description such that it explicitly closes the relevant issue (e.g., using keywords like "Closes #123" or "Fixes #123").

# TemplateGoblin Core Rules (from CLAUDE.md)

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
11. **No source file (.ts/.tsx) may exceed 300 lines.**
12. **Every push must include a Changeset — generated _at push time_, not per commit.**
13. **Never add Claude (or any AI) attribution to commits.**
14. **Every major version bump must be reflected in git.**
15. **Do exactly what is asked — nothing more.**
16. **Run master QA only when explicitly asked.**
17. **After every PR merge, sync local main from origin.**
18. **"Merge" (and "commit and push and merge") is a one-shot pipeline.**
19. **Never work directly on `main` — branch first, always.**
20. **Clarify before starting — both when filing an issue and when starting work on one.**

# Agent specific rules

- Do not push, raise PR, or merge PR without the user's explicit permission. You may commit without permission, but any interaction with the remote repository requires confirmation.
- When searching for a function's implementation based on UI interactions, do not just search for the function name globally. Instead, follow the component flow (e.g., start from the sidebar component, see which child component it calls, and trace it down to the function). This ensures you catch any side-effects or errors in the calling components.
