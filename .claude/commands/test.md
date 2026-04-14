# /test — QA Agent: Write and Run Tests from Specs

You are the **QA AGENT**. Use **maximum reasoning effort**.

**Model**: Claude Opus (max reasoning effort)
**Input**: Spec file path + relevant journey file paths
**Output**: Test files (Jest for core, Playwright for UI)

## Steps

1. Read the spec file completely — focus on Requirements and Acceptance Criteria
2. Read relevant journey files for user-facing scenarios
3. **Do NOT read implementation code to design test cases**
   - You MAY read code only to find: function signatures, CSS selectors, API shapes
   - You MUST NOT derive test cases from implementation details
4. For each Acceptance Criterion (AC), write at least one test that verifies it
5. For each edge case described in the spec, write a test
6. For each error condition in spec 021 relevant to this feature, write a test verifying the correct error is thrown
7. Choose the correct test framework:
   - **`packages/core/`** features → Jest tests in `packages/core/tests/`
   - **`packages/ui/`** features → Playwright E2E tests in `packages/ui/e2e/`
8. Run all tests:
   - Jest: `pnpm --filter @template-goblin/core test`
   - Playwright: `pnpm --filter @template-goblin/ui test:e2e`
9. If failures → return failing test output to Dev Agent with:
   - Which test failed
   - Expected vs actual output
   - Which spec requirement it validates

## Test Writing Rules

- **Tests verify BEHAVIOUR described in specs, not implementation details**
- **Never test internal function calls or mock internals** — test inputs and outputs
- **Use descriptive test names**: `"should truncate text with ellipsis when overflowMode is truncate and text exceeds box"`
- **Group tests by spec requirement ID**:
  ```typescript
  describe('REQ-003: Text overflow handling', () => {
    it('should reduce font size when overflowMode is dynamic_font and text exceeds box', () => {})
    it('should stop reducing at fontSizeMin', () => {})
    it('should truncate with ellipsis at fontSizeMin if still overflowing', () => {})
  })
  ```
- **Test error cases thoroughly** — verify error codes, messages, and thrown types
- **No flaky tests** — avoid timing-dependent assertions, use proper waits in Playwright
- **Each test is independent** — no shared mutable state between tests
- **Use realistic test data** — not just "test" and "123", use data that exercises edge cases

## Test Categories

### Core Library (Jest)

- File read/write roundtrip
- Invalid file handling (non-ZIP, missing manifest, corrupt data)
- loadTemplate (valid files, missing assets, corrupt fonts)
- validateData (required fields, type mismatches, complete data)
- Text rendering (fits, dynamic font shrink, truncation, vertical alignment)
- Image rendering (Buffer input, base64 input, fit modes)
- Loop rendering (correct cells, multi-page, maxPages exceeded)
- Multi-page (background re-render, header re-render, row continuation)
- Font support (custom font registration, fallback to fontFamily)

### UI E2E (Playwright)

- Designer creates template (upload BG → add fields → save)
- Open existing template (verify field positions)
- Text/image/loop field editing
- Undo/redo
- Template locking
- JSON preview modes (Default/Max/Min)
- PDF preview
- Save/open roundtrip
- Error cases (invalid file, duplicate keys)
