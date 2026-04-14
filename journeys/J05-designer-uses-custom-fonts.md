# Journey 05 — Designer Uses Custom Fonts

## Actor

Designer

## Goal

Upload a branded custom font, apply it to text fields, verify it renders correctly on the canvas, and confirm it persists after saving and reopening the template.

## Preconditions

- The TemplateGoblin UI is open with a template loaded.
- The designer has a `.ttf` font file ready (e.g., `BrandSerif-Regular.ttf`).

## Steps

1. Click the "Fonts" button in the toolbar.
   - Expected result: The font management panel opens, showing any previously uploaded fonts (or an empty list for a new template).

2. Click "Upload Font" and select `BrandSerif-Regular.ttf`.
   - Expected result: The font is validated, uploaded, and appears in the font list with a text preview showing "The quick brown fox jumps over the lazy dog" (or similar sample text) rendered in the uploaded font.

3. Optionally edit the preview sample text to "Springfield High School".
   - Expected result: The preview text updates to "Springfield High School" rendered in the uploaded font.

4. Close the font management panel.
   - Expected result: The panel closes. The toolbar and canvas return to normal view.

5. Select a text field (e.g., "schoolName") and open its style editor.
   - Expected result: The font family dropdown now includes "BrandSerif-Regular" alongside built-in fonts.

6. Select "BrandSerif-Regular" from the font family dropdown.
   - Expected result: The canvas immediately re-renders the "schoolName" text in the BrandSerif-Regular font. The style panel shows the selected font.

7. Save the template.
   - Expected result: The `.tgbl` file is saved. The archive contains `fonts/BrandSerif-Regular.ttf`. The manifest `fonts[]` array has an entry for the font.

8. Close and reopen the template.
   - Expected result: The template loads with the custom font intact. The "schoolName" field renders in BrandSerif-Regular. The font appears in the Fonts panel and in font family dropdowns.

## Edge Cases

- What if the designer uploads a file that is not a valid `.ttf` font? --> The UI shows an error "Only .ttf font files are supported" or "Font file could not be loaded" and does not add it to the list.
- What if the designer tries to remove BrandSerif-Regular while "schoolName" uses it? --> A confirmation dialog appears listing "schoolName" as an affected field. If confirmed, "schoolName" reverts to the default font.
- What if the designer uploads two fonts with the same filename? --> The second font gets a suffixed ID (e.g., `brandserif-regular-2`) and both appear in the font list.
- What if the font file is very large (e.g., 15 MB)? --> The UI warns about the file size but allows the upload (or rejects if over the limit).

## Success Criteria

The custom font is successfully uploaded, previewed, applied to a text field, rendered on the canvas, saved in the `.tgbl` archive, and correctly restored when the template is reopened. The end-to-end font workflow is seamless with no missing glyph or rendering errors.
