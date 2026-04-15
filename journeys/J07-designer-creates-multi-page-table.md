# Journey 07 — Designer Creates Multi-Page Table

## Actor

Designer

## Goal

Create a template with a marks table that can span multiple pages via loop overflow, and also add user-defined pages for additional content. Verify that both mechanisms work correctly: loop-overflow pagination with header repetition and background re-rendering, and user-defined pages with independent backgrounds and page-scoped fields.

## Preconditions

- The TemplateGoblin UI is open.
- A template with a background image is loaded (or a new template is started with a background).
- The designer expects the marks table to have 50+ rows in real usage.

## Steps

### Part 1 — Loop-Overflow Multi-Page

1. Add a loop field to the template and name it "marks".
   - Expected result: A loop field appears on the canvas, assigned to Page 1. The designer positions it in the main content area and configures columns (e.g., "subjectCode", "subjectName", "grade").

2. Open the loop field's style editor and enable the `multiPage` toggle.
   - Expected result: The `multiPage` property is set to `true`. Additional multi-page options become visible.

3. Set `maxPages` to 5.
   - Expected result: The `maxPages` value is updated to 5 in the style editor. This means the table can generate up to 5 overflow pages before an error is raised.

4. Switch to preview mode and enter sample data with 50+ rows.
   - Expected result: The preview generates multiple pages. The first page shows the table starting at its configured position. Subsequent overflow pages continue the table from the top of the loop field's bounding rectangle.

5. Verify that the table header repeats on each overflow page.
   - Expected result: Every overflow page that contains table rows begins with the header row ("Subject Code", "Subject Name", "Grade") styled according to `headerStyle`.

6. Verify that the background repeats on each overflow page.
   - Expected result: Each overflow page displays the same background as Page 1 (the page containing the loop field). The certificate border/letterhead appears on every overflow page.

7. Verify that non-loop fields (e.g., "studentName", "schoolName") appear only on Page 1.
   - Expected result: Text fields and image fields on Page 1 render on Page 1 only. Overflow pages show only the background and the continued table.

8. Test with data that would exceed `maxPages` (e.g., 200 rows requiring 8 overflow pages with `maxPages` set to 5).
   - Expected result: The preview shows an error indicating that the data exceeds the maximum page limit. In the library, this throws `MaxPagesExceededError`.

### Part 2 — User-Defined Multi-Page Combined with Loop Overflow

9. Click the "Add Page" button in the page tab bar.
   - Expected result: The background choice dialog appears with options: Upload Image, Solid Color, Inherit from Previous.

10. Select "Inherit from Previous" and confirm.
    - Expected result: A new "Page 2" is created with the same background as Page 1. The canvas switches to Page 2.

11. Add text fields to Page 2 for "principalRemarks" and "verificationStamp".
    - Expected result: Both fields appear on Page 2 and are assigned to Page 2 via `pageId`. Switching back to Page 1 hides these fields.

12. Click "Add Page" again and select "Solid Color" with a light grey (#F5F5F5).
    - Expected result: A new "Page 3" is created with a grey background. The canvas switches to Page 3.

13. Add a text field "disclaimer" to Page 3.
    - Expected result: The field is assigned to Page 3. The page tab bar shows three tabs: "Page 1", "Page 2", "Page 3".

14. Switch to preview mode with 50+ rows of marks data.
    - Expected result: The preview generates the correct page order: Page 1 (all fields including marks table start), overflow pages (table continuation with Page 1's background), Page 2 (principalRemarks and verificationStamp with inherited background), Page 3 (disclaimer with grey background).

15. Verify the total page count.
    - Expected result: With 50 rows and 10 rows per page, the marks table uses Page 1 + 4 overflow pages = 5 pages, then Page 2, then Page 3 = 7 total pages.

### Part 3 — Page Management

16. Right-click the "Page 2" tab and select "Delete Page".
    - Expected result: A confirmation dialog appears warning that all fields on Page 2 will be deleted. After confirming, Page 2 is removed along with its fields. Page 3 becomes Page 2. The page tab bar updates.

17. Attempt to delete the last remaining page.
    - Expected result: With Page 1 and the remaining page, right-clicking Page 1 shows "Delete Page" is enabled. But if the designer deletes the other page first, the "Delete Page" option on the last remaining page is disabled.

18. Save the template.
    - Expected result: The `.tgbl` file is saved with `multiPage: true`, `maxPages: 5`, and the `pages` array containing the remaining page definitions. Reopening the template preserves all settings including page-specific backgrounds and field assignments.

## Edge Cases

- What if `multiPage` is enabled but `maxPages` is set to 1? --> The table behaves as single-page; overflow throws `MaxPagesExceededError` since only 1 overflow page is allowed and the data requires more.
- What if the loop field is positioned very low on the page, leaving little room for rows? --> Fewer rows fit per page, resulting in more overflow pages. The preview reflects this accurately.
- What if the data has exactly enough rows to fill one page? --> Only one page is generated; multi-page settings have no visible effect but are stored for future data changes.
- What if a single row is taller than the available space on a page (extremely large padding/font)? --> The row is rendered as best as possible, potentially clipping, and a warning is shown.
- What if `maxPages` is set to 0? --> Validation rejects this as invalid; `maxPages` must be at least 1.
- What if a user-defined page has no fields? --> The page renders with its background only (valid use case).
- What if a page using "inherit" has its source page deleted? --> The page inherits from its new predecessor after renumbering, or is prompted for a new background if it becomes the first page.
- What if the designer reorders pages so that a loop field's page moves to a later position? --> Overflow pages are inserted after the loop field's parent page in the new order. The final PDF reflects the reordered structure.

## Success Criteria

The template correctly generates a multi-page PDF where: (1) the marks table flows across overflow pages when data exceeds one page, (2) the header row repeats on every overflow page, (3) the parent page's background repeats on every overflow page, (4) non-loop fields on the same page appear only on the original page (not overflow pages), (5) user-defined pages appear in index order with their own backgrounds and fields, (6) overflow pages are inserted immediately after their parent page, (7) exceeding `maxPages` produces a clear error, and (8) the saved template retains all multi-page and page configuration on reload.
