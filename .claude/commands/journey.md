# /journey — Create a New User Journey

Create a new user journey file in the `journeys/` directory.

**Input**: Journey description
**Output**: A new journey file following the project journey template

## Steps

1. Scan `journeys/` directory to determine the next journey number (pad to 2 digits)
2. Read `prompt.md` Part 9 for the journey file template
3. Read `CLAUDE.md` for project context
4. Identify the actor: **Designer** (uses the UI) or **Developer** (uses the npm library)
5. Create the journey file at `journeys/J<NN>-<kebab-case-name>.md` with all sections:
   - **Actor**: Designer or Developer
   - **Goal**: What they want to achieve
   - **Preconditions**: What must be true before starting
   - **Steps**: Numbered actions with expected results for each
   - **Edge Cases**: What-if scenarios with expected behaviour
   - **Success Criteria**: What makes this journey "done" from the user's perspective
6. Cross-reference with relevant specs — note which specs this journey exercises
7. Write from the user's perspective — describe what they see and do, not internal system behaviour

## Rules

- Journeys describe user-visible behaviour only
- Every step has an expected result
- Include realistic edge cases (empty data, long text, missing images, etc.)
- Use concrete examples, not abstract descriptions
- Reference spec numbers where relevant (e.g., "text overflow per spec 003")
