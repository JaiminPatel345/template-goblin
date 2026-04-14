# Journey 07 — Designer Creates Multi-Page Table

## Actor

Designer

## Goal

Create a template with a marks table that can span multiple pages, verify that pagination, header repetition, and background repetition work correctly in the preview.

## Preconditions

- The TemplateGoblin UI is open.
- A template with a background image is loaded (or a new template is started with a background).
- The designer expects the marks table to have 50+ rows in real usage.

## Steps

1. Add a loop field to the template and name it "marks".
   - Expected result: A loop field appears on the canvas. The designer positions it in the main content area and configures columns (e.g., "subjectCode", "subjectName", "grade").

2. Open the loop field's style editor and enable the `multiPage` toggle.
   - Expected result: The `multiPage` property is set to `true`. Additional multi-page options become visible.

3. Set `maxPages` to 5.
   - Expected result: The `maxPages` value is updated to 5 in the style editor. This means the table can span up to 5 pages before data is truncated or an error is raised.

4. Switch to preview mode and enter sample data with 50+ rows.
   - Expected result: The preview generates multiple pages. The first page shows the table starting at its configured position. Subsequent pages continue the table from the top of the loop field's Y position.

5. Verify that the table header repeats on each page.
   - Expected result: Every page that contains table rows begins with the header row ("Subject Code", "Subject Name", "Grade") styled according to `headerStyle`.

6. Verify that the background image repeats on each page.
   - Expected result: Each generated page displays the full background image, not just the first page. The certificate border/letterhead appears on every page.

7. Verify that non-loop fields (e.g., "studentName", "schoolName") appear only on the first page.
   - Expected result: Text fields and image fields outside the loop render on page 1 only. Subsequent pages show only the background and the continued table.

8. Test with data that would exceed `maxPages` (e.g., 200 rows requiring 8 pages with `maxPages` set to 5).
   - Expected result: The preview shows an error or warning indicating that the data exceeds the maximum page limit. In the library, this would throw `MAX_PAGES_EXCEEDED`.

9. Save the template.
   - Expected result: The `.tgbl` file is saved with `multiPage: true` and `maxPages: 5` in the loop field's style. Reopening the template preserves these settings.

## Edge Cases

- What if `multiPage` is enabled but `maxPages` is set to 1? --> The table behaves as single-page; rows beyond the first page are truncated with a warning in preview.
- What if the loop field is positioned very low on the page, leaving little room for rows? --> Fewer rows fit per page, resulting in more pages. The preview reflects this accurately.
- What if the data has exactly enough rows to fill one page? --> Only one page is generated; multi-page settings have no visible effect but are stored for future data changes.
- What if a single row is taller than the available space on a page (extremely large padding/font)? --> The row is rendered as best as possible, potentially clipping, and a warning is shown.
- What if `maxPages` is set to 0? --> Validation rejects this as invalid; `maxPages` must be at least 1.

## Success Criteria

The template correctly generates a multi-page PDF preview where: (1) the marks table flows across pages when data exceeds one page, (2) the header row repeats on every page, (3) the background image repeats on every page, (4) non-loop fields appear only on page 1, and (5) exceeding `maxPages` produces a clear error. The saved template retains all multi-page configuration on reload.
