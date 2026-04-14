# /spec — Create a New Spec File

Create a new spec file in the `specs/` directory.

**Input**: Feature name and number (or auto-detect next number)
**Output**: A new spec file following the project spec template

## Steps

1. Scan `specs/` directory to determine the next spec number (pad to 3 digits)
2. Read `prompt.md` Part 8 for the spec file template
3. Read `CLAUDE.md` for project rules and architecture context
4. Cross-reference with existing specs in `specs/` to identify dependencies
5. Create the spec file at `specs/<NNN>-<kebab-case-name>.md` with all sections:
   - **Status**: Set to "Draft"
   - **Summary**: One paragraph describing what this spec covers
   - **Requirements**: Numbered REQ-NNN items with checkboxes
   - **Behaviour**: Happy path, edge cases, error conditions
   - **Input / Output**: Type signatures where relevant
   - **Acceptance Criteria**: Numbered AC-NNN items with checkboxes
   - **Dependencies**: Which other specs this depends on
   - **Notes**: Open questions or deferred decisions
6. Ensure every requirement is specific and testable — no vague language
7. Reference error codes from spec 021 where applicable

## Rules

- Every requirement must be testable by the QA Agent
- Use precise language — "MUST", "SHOULD", "MAY" per RFC 2119
- Include all error conditions that could occur
- Reference related specs by number (e.g., "see spec 002")
- Do not include implementation details — specs describe WHAT, not HOW
