# Journey 06 — Developer Handles Errors

## Actor

Developer

## Goal

Exercise all major error paths in the `template-goblin` library to verify that errors are structured, informative, and programmatically actionable.

## Preconditions

- Node.js (v18+) is installed.
- The `template-goblin` package is installed.
- The developer has various test files: a valid `.tgbl`, a corrupted file, a `.tgbl` missing required assets, and sample data objects with deliberate errors.

## Steps

1. Attempt to load a non-existent file path.
   - Expected result: `loadTemplate("./does-not-exist.tgbl")` throws a `TemplateGoblinError` with `code: "FILE_NOT_FOUND"` and a message like "Template file not found: ./does-not-exist.tgbl".

2. Attempt to load a file with a `.tgbl` extension but invalid ZIP contents (e.g., a plain text file renamed to `.tgbl`).
   - Expected result: `loadTemplate("./fake.tgbl")` throws a `TemplateGoblinError` with `code: "INVALID_FORMAT"` and a message indicating the file is not a valid ZIP archive.

3. Attempt to load a `.tgbl` archive that is missing `manifest.json`.
   - Expected result: `loadTemplate("./no-manifest.tgbl")` throws with `code: "MISSING_MANIFEST"`.

4. Attempt to load a `.tgbl` with a malformed `manifest.json` (e.g., invalid JSON or missing required fields).
   - Expected result: `loadTemplate("./bad-manifest.tgbl")` throws with `code: "INVALID_MANIFEST"` and details listing the validation failures.

5. Attempt to generate a PDF with missing required data fields.
   - Expected result: `generatePDF(template, { schoolName: "Test" })` (missing `studentName`, `indexNumber`, etc.) throws with `code: "MISSING_REQUIRED_FIELD"` and details including the missing field names.

6. Attempt to generate a PDF with wrong data types (e.g., a number where a string is expected).
   - Expected result: `generatePDF(template, { studentName: 12345 })` throws with `code: "INVALID_DATA_TYPE"` and details like `{ field: "studentName", expected: "string", received: "number" }`.

7. Attempt to generate a PDF with loop data that would exceed `maxPages`.
   - Expected result: If the template's loop has `maxPages: 3` and the data contains 500 rows that would require 10 pages, `generatePDF()` throws with `code: "MAX_PAGES_EXCEEDED"` and details indicating the limit and attempted page count.

8. Catch each error and inspect its properties programmatically.
   - Expected result: Each caught error is an instance of `TemplateGoblinError`. The `code` property is a known string enum value. The `message` is human-readable. The optional `details` object contains contextual information. No raw stack traces are needed for error handling logic.

## Edge Cases

- What if the developer passes `null` or `undefined` as the template? --> A `TypeError` or `TemplateGoblinError` with `code: "INVALID_FORMAT"` is thrown.
- What if the developer passes extra, unused data fields? --> No error is thrown; extra fields are silently ignored.
- What if the developer calls `generatePDF` with an empty data object `{}`? --> All required fields are reported as missing in a single `MISSING_REQUIRED_FIELD` error (or via `validateData()` returning all missing fields).
- What if a font referenced by the template cannot be loaded at generation time? --> `FONT_LOAD_FAILED` is thrown with the font ID in details.

## Success Criteria

The developer can confidently write error-handling code using `error.code` in switch statements or conditionals. Every error code documented in spec 021 is exercisable and returns structured, actionable information. No error produces a raw stack trace as the primary output -- the `code` and `message` are always sufficient for programmatic and human consumption.
