# Journey 01 — Designer Creates Result Template

## Actor

Designer

## Goal

Create a school result certificate template from scratch, including student info text fields, a student photo image field, and a marks table (loop field), then save it as a `.tgbl` file.

## Preconditions

- The TemplateGoblin UI is open (via `npx template-goblin-ui` or dev server).
- The designer has a background image file (e.g., a school certificate border/letterhead) ready.
- The designer has sample data in mind for preview (student name, index number, subjects, grades).

## Steps

1. Open the TemplateGoblin UI in the browser.
   - Expected result: A blank canvas appears with the toolbar and left panel visible.

2. Click "New Template" and select page size A4.
   - Expected result: The canvas resizes to A4 dimensions (595 x 842 pt).

3. Click "Upload Background" and select the certificate background image.
   - Expected result: The background image renders on the canvas, filling the page. The page tab bar at the bottom shows "Page 1" as the active tab.

4. Add a text field for the student's name.
   - Expected result: A text field appears on the canvas with a default label, assigned to Page 1. The designer renames it to "studentName", positions it near the top center, sets font size to 18, alignment to center, and font weight to bold.

5. Add a text field for the index number.
   - Expected result: A second text field appears, assigned to Page 1. The designer renames it to "indexNumber", positions it below the name, and sets font size to 14.

6. Add a text field for the school name.
   - Expected result: A third text field appears, assigned to Page 1. The designer renames it to "schoolName", positions it at the top of the certificate, sets font size to 16, alignment to center.

7. Add an image field for the student photo.
   - Expected result: An image field appears with a placeholder outline, assigned to Page 1. The designer renames it to "studentPhoto", resizes it to passport-photo dimensions, positions it in the upper-right area, and sets fit mode to "contain."

8. Add a loop field for the marks table.
   - Expected result: A loop field appears on the canvas, assigned to Page 1. The designer renames it to "marks" and positions it in the center-lower area.

9. Configure the loop columns: subject code, subject name, and grade.
   - Expected result: Three columns are defined with keys "subjectCode", "subjectName", and "grade". Column labels display as "Subject Code", "Subject Name", and "Grade". Column widths are adjusted to fit the table area.

10. Configure table styles (header background, border, font sizes).
    - Expected result: The header row shows bold text on a light grey background. Row borders are visible. The canvas preview reflects these styles.

11. Add a second page for additional remarks and signatures.
    - Expected result: The designer clicks the "Add Page" button in the page tab bar. The background choice dialog appears. The designer selects "Solid Color" and picks a light cream color (#FFF8E7). A new "Page 2" tab appears and the canvas switches to the new page showing the solid color background.

12. Add text fields for remarks and signatures on Page 2.
    - Expected result: The designer adds a text field "principalRemarks" (large text area, center of the page) and a text field "principalSignature" (bottom-right). Both fields are assigned to Page 2. Switching back to "Page 1" hides these fields; switching to "Page 2" shows them.

13. Switch to "Max" preview mode and enter sample data.
    - Expected result: The preview populates with maximum-length sample data across both pages. Page 1 shows the student name, photo, and marks table. Page 2 shows the remarks and signature fields. Text overflow handling is visible (truncation or dynamic font sizing depending on configuration).

14. Save the template as "school-result.tgbl".
    - Expected result: A download prompt appears (or the file saves to the configured location). The `.tgbl` file is a valid ZIP containing `manifest.json`, background image(s), and placeholder images. The manifest includes a `pages` array with two page definitions.

## Edge Cases

- What if the background image is very large (e.g., 20 MB)? --> The UI should warn about large file sizes and suggest optimizing the image, but still allow the upload.
- What if the designer forgets to add a background? --> The save operation prompts for a background image before proceeding.
- What if two fields are given the same key name? --> The UI shows an inline warning about duplicate keys.
- What if the loop table exceeds the page boundary? --> The overflow is visible in preview; the designer can enable `multiPage` on the loop field to allow page breaks.
- What if the designer deletes Page 2? --> All fields on Page 2 (principalRemarks, principalSignature) are also deleted. A confirmation dialog warns the designer.

## Success Criteria

A valid `school-result.tgbl` file is saved that, when reopened in the UI, displays all fields across both pages (Page 1: studentName, indexNumber, schoolName, studentPhoto, marks loop; Page 2: principalRemarks, principalSignature) correctly positioned with their configured styles. The template can be loaded by the library and used to generate a 2-page PDF with real student data.
