# Journey 08 — Designer Creates Multi-Page Certificate

## Actor

Designer

## Goal

Create a 3-page professional certificate template where each page has a different background: page 1 uses an uploaded ornamental border image, page 2 uses a solid color, and page 3 inherits page 2's background. Fields are distributed across pages with page-specific content. The designer navigates between pages using the page tab bar, verifies field scoping, and saves the template.

## Preconditions

- The TemplateGoblin UI is open (via `npx template-goblin-ui` or dev server).
- The designer has a decorative certificate border image (e.g., gold border with a crest) ready for upload.
- The designer has planned a 3-page certificate layout:
  - Page 1: Cover page with recipient name, award title, and organization logo.
  - Page 2: Details page with award description, criteria, and a scores table.
  - Page 3: Signatures page with signatory names, titles, dates, and an official stamp.

## Steps

1. Open the TemplateGoblin UI and click "New Template". Select page size A4.
   - Expected result: The canvas resizes to A4 dimensions (595 x 842 pt). The page tab bar at the bottom shows "Page 1" as the active tab with an "Add Page" button.

2. Click "Upload Background" and select the ornamental certificate border image.
   - Expected result: The PageSizeDialog appears showing the image dimensions. The designer selects A4. The image is compressed and displayed as Page 1's background. Original vs compressed size is shown (e.g., "Original: 3.1 MB, Compressed: 420 KB").

3. Add a text field "awardTitle" on Page 1.
   - Expected result: A text field appears on the canvas, assigned to Page 1. The designer positions it in the upper-center area, sets font size to 28, alignment to center, font weight to bold. Labels it "Award Title".

4. Add a text field "recipientName" on Page 1.
   - Expected result: A text field appears, assigned to Page 1. Positioned center of the page, font size 24, alignment center. Labels it "Recipient Name".

5. Add an image field "organizationLogo" on Page 1.
   - Expected result: An image field appears with a placeholder outline, assigned to Page 1. Positioned at the top-center above the award title, fit mode "contain", sized to 120x80 pt.

6. Add a text field "awardDate" on Page 1.
   - Expected result: A text field appears, assigned to Page 1. Positioned below the recipient name, font size 14, alignment center. Labels it "Award Date".

7. Click the "Add Page" button in the page tab bar to create Page 2.
   - Expected result: The background choice dialog appears with three options: Upload Image, Solid Color, Inherit from Previous.

8. Select "Solid Color" and choose a light ivory color (#FFFFF0) using the color picker.
   - Expected result: Page 2 is created with an ivory background. The canvas switches to Page 2. The page tab bar now shows "Page 1" and "Page 2" tabs, with "Page 2" highlighted as active. The canvas displays the solid ivory background.

9. Verify that Page 1 fields are not visible on Page 2.
   - Expected result: The canvas on Page 2 shows only the ivory background — no fields from Page 1 are visible. This confirms field scoping by `pageId`.

10. Add a text field "awardDescription" on Page 2.
    - Expected result: A large text field appears, assigned to Page 2. Positioned in the upper half of the page, sized to 450x200 pt, font size 12, alignment left. Labels it "Award Description".

11. Add a text field "selectionCriteria" on Page 2.
    - Expected result: A text field appears, assigned to Page 2. Positioned below the description, font size 11, alignment left. Labels it "Selection Criteria".

12. Add a loop field "scores" on Page 2 for a scoring breakdown table.
    - Expected result: A loop field appears, assigned to Page 2. The designer positions it in the lower half of the page and configures columns: "category" (width 200), "score" (width 100), "maxScore" (width 100). Header style: bold on light grey. The designer does NOT enable `multiPage` since the scores table is short (under 10 rows expected).

13. Click the "Add Page" button to create Page 3.
    - Expected result: The background choice dialog appears.

14. Select "Inherit from Previous" and confirm.
    - Expected result: Page 3 is created with `backgroundType: "inherit"`, inheriting Page 2's ivory background. The canvas switches to Page 3 showing the same ivory color. The page tab bar shows three tabs.

15. Verify that Page 3's background matches Page 2.
    - Expected result: Page 3 displays the same ivory (#FFFFF0) background as Page 2, confirming the "inherit" mechanism works.

16. Add a text field "signatory1Name" on Page 3.
    - Expected result: A text field appears, assigned to Page 3. Positioned in the left-center area, font size 14, alignment center.

17. Add a text field "signatory1Title" on Page 3.
    - Expected result: A text field below signatory1Name, font size 11, alignment center, font style italic.

18. Add a text field "signatory2Name" on Page 3.
    - Expected result: Positioned in the right-center area, mirroring signatory1Name's layout.

19. Add a text field "signatory2Title" on Page 3.
    - Expected result: Below signatory2Name, matching signatory1Title's style.

20. Add a text field "signatureDate" on Page 3.
    - Expected result: Positioned at the bottom-center, font size 12, alignment center.

21. Add an image field "officialStamp" on Page 3.
    - Expected result: An image field positioned between the two signatory blocks, fit mode "contain", sized to 100x100 pt.

22. Navigate between pages using the page tab bar.
    - Expected result: Clicking "Page 1" shows the ornamental border with awardTitle, recipientName, organizationLogo, and awardDate. Clicking "Page 2" shows the ivory background with awardDescription, selectionCriteria, and scores table. Clicking "Page 3" shows the inherited ivory background with signatory fields and officialStamp. Each page shows only its own fields.

23. Switch to "Max" preview mode and verify all three pages.
    - Expected result: The preview renders three pages in sequence. Page 1 shows the certificate cover with sample data. Page 2 shows the details with a populated scores table. Page 3 shows the signature page. All backgrounds render correctly.

24. Test page reordering by dragging "Page 3" before "Page 2".
    - Expected result: After reordering, the page tab bar shows "Page 1", "Page 3" (now index 1), "Page 2" (now index 2). Page 3 (now at index 1) previously used "inherit" — since it is no longer at index 0 and Page 1 precedes it, it now inherits from Page 1 (the ornamental border). The designer notices this and decides to revert the order.

25. Drag "Page 3" back to its original position (after Page 2).
    - Expected result: The page order returns to Page 1, Page 2, Page 3. Page 3 once again inherits from Page 2 (ivory background).

26. Save the template as "professional-certificate.tgbl".
    - Expected result: The `.tgbl` file downloads. It contains `manifest.json` with a `pages` array of 3 entries, the background image for Page 1, and all field definitions with correct `pageId` references.

## Edge Cases

- What if the designer tries to drag Page 3 (inherit) to index 0? --> The UI prompts the designer to choose a new background type (image or color) since the first page cannot use "inherit".
- What if the designer deletes Page 2 while Page 3 inherits from it? --> Page 3 (now Page 2) inherits from Page 1 instead. The background changes from ivory to the ornamental border. A notice could inform the designer.
- What if the designer uploads a very large image for Page 1's background? --> Image compression runs; original vs compressed size is displayed. The upload proceeds even for large files, with a progress indicator.
- What if the designer adds no fields to a page? --> The page renders with its background only. This is valid (e.g., a decorative blank page).
- What if the designer reopens the saved template? --> All three pages load with their backgrounds and fields intact. The page tab bar shows all three pages. Navigating between them displays the correct fields.

## Success Criteria

A valid `professional-certificate.tgbl` file is saved that, when reopened in the UI, displays three pages: (1) Page 1 with an ornamental border image background and cover fields (awardTitle, recipientName, organizationLogo, awardDate), (2) Page 2 with a solid ivory background and details fields (awardDescription, selectionCriteria, scores loop), and (3) Page 3 with an inherited ivory background and signature fields (signatory1Name, signatory1Title, signatory2Name, signatory2Title, signatureDate, officialStamp). Each page shows only its own fields. The template can be loaded by the library and used to generate a 3-page PDF with real data, where each page has the correct background.
