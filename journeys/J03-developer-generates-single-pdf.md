# Journey 03 — Developer Generates Single PDF

## Actor

Developer

## Goal

Use the `template-goblin` npm library programmatically to load a `.tgbl` template and generate a single PDF with sample student data.

## Preconditions

- Node.js (v18+) is installed.
- A valid `.tgbl` template file exists (e.g., `school-result.tgbl`).
- The developer has student data to fill into the template.

## Steps

1. Install the `template-goblin` package.
   - Expected result: `npm install template-goblin` completes successfully. The package is added to `node_modules` and `package.json`.

2. Write a script that imports `loadTemplate` and `generatePDF` from `template-goblin`.
   - Expected result: The imports resolve without errors.

3. Call `loadTemplate("./school-result.tgbl")` to load the template.
   - Expected result: The function returns a parsed template object containing the manifest, background image buffer, and font buffers. No errors are thrown.

4. Call `generatePDF()` with the loaded template and sample data.
   - Expected result: The function accepts data like `{ studentName: "Alice Johnson", indexNumber: "2024-001", schoolName: "Springfield High", studentPhoto: <Buffer>, marks: [{ subjectCode: "MAT", subjectName: "Mathematics", grade: "A" }, ...] }` and returns a `Buffer` containing the generated PDF.

5. Write the PDF buffer to a file using `fs.writeFileSync("output.pdf", buffer)`.
   - Expected result: A file `output.pdf` is created on disk.

6. Open the generated PDF and verify the output.
   - Expected result: The PDF shows the certificate background with student name, index number, school name, and photo rendered in their template-defined positions and styles. The marks table displays all subjects with correct formatting.

## Edge Cases

- What if the `.tgbl` file path is wrong? --> `loadTemplate()` throws a `TemplateGoblinError` with code `FILE_NOT_FOUND`.
- What if a required field is missing from the data object? --> `generatePDF()` throws with code `MISSING_REQUIRED_FIELD`, including the field name in the error details.
- What if the student photo buffer is not a valid image? --> `generatePDF()` throws with code `INVALID_DATA_TYPE` indicating the image field could not be processed.
- What if the data contains extra fields not in the template? --> Extra fields are silently ignored; no error is thrown.

## Success Criteria

A valid PDF file is generated that visually matches the template layout with all data fields populated. The file can be opened in any standard PDF viewer. The developer's script runs end-to-end without unhandled errors.
