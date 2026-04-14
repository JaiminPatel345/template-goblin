# Journey 04 — Designer Previews Edge Cases

## Actor

Designer

## Goal

Test a template with extreme data to verify that text overflow, dynamic font sizing, and minimal data scenarios are handled gracefully in the preview.

## Preconditions

- The TemplateGoblin UI is open.
- A template with text fields and a loop field is loaded (e.g., `school-result.tgbl`).
- At least one text field has `overflowMode` set to `dynamic_font` with `fontSizeDynamic: true`.

## Steps

1. Open the template in the UI and navigate to the preview panel.
   - Expected result: The preview renders with default/sample data.

2. Switch to "Max" preview mode.
   - Expected result: All fields are populated with maximum-length sample data. Text fields show long strings (e.g., a very long student name). The marks table shows the maximum number of rows.

3. Observe how long text is handled in fixed-size text fields.
   - Expected result: Fields configured with `overflowMode: "truncate"` show truncated text with an ellipsis or cut-off. Fields with `overflowMode: "dynamic_font"` show the text at a reduced font size that fits within the field bounds, not going below `fontSizeMin`.

4. Check that the marks table handles many rows.
   - Expected result: If `multiPage` is disabled, excess rows are truncated at `maxRows`. If `multiPage` is enabled, the preview shows multiple pages with the table flowing across them.

5. Switch to "Min" preview mode.
   - Expected result: All fields are populated with minimal data (e.g., single-character strings, one row in the marks table). The layout remains intact with no visual glitches from very short content.

6. Observe dynamic font sizing with short text.
   - Expected result: Fields with `fontSizeDynamic: true` render at their configured `fontSize` (not enlarged beyond the base size), since the short text fits comfortably.

7. Toggle back to "Max" mode and verify that dynamic font sizing adjusts text to fit.
   - Expected result: A text field with a long value and `fontSizeDynamic: true` renders at a smaller font size than the base `fontSize`, down to but not below `fontSizeMin`. The text is fully visible within the field bounds.

## Edge Cases

- What if `fontSizeMin` is set very low (e.g., 2pt)? --> The text becomes extremely small but still renders without error. The designer should notice this is impractical and adjust the setting.
- What if "Max" data overflows a field that has no overflow handling configured? --> The text simply clips at the field boundary; the designer sees the issue and can enable dynamic font sizing or increase the field size.
- What if the loop field has zero rows in "Min" mode? --> The table header renders but the body is empty. No error is thrown.
- What if all fields are empty in "Min" mode? --> The template renders with the background only and empty field areas. The designer sees the "bare" layout.

## Success Criteria

The designer has visually verified that the template handles both extreme maximum data and bare minimum data gracefully. Dynamic font sizing visibly reduces text size for long content without going below the minimum. Truncation mode clips text as expected. The preview switches between modes without errors or layout corruption.
