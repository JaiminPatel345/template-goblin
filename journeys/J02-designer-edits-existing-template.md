# Journey 02 — Designer Edits Existing Template

## Actor

Designer

## Goal

Open a previously saved `.tgbl` template, verify that all fields load correctly, make layout and style modifications, and re-save the template.

## Preconditions

- The TemplateGoblin UI is open.
- A valid `.tgbl` file exists (e.g., `school-result.tgbl` created in Journey 01).

## Steps

1. Click "Open Template" and select the `school-result.tgbl` file.
   - Expected result: The template loads with its background image, all fields visible on the canvas in their saved positions, and all fields listed in the left panel.

2. Verify that all fields are present and correctly positioned.
   - Expected result: "studentName", "indexNumber", "schoolName", "studentPhoto", and "marks" fields all appear at their saved coordinates with correct styles.

3. Select the "studentName" text field and drag it to a new position.
   - Expected result: The field moves on the canvas. The x/y coordinates update in the properties panel.

4. Select the "indexNumber" text field and change its font size from 14 to 16.
   - Expected result: The font size updates in the style panel. The canvas preview reflects the larger text.

5. Add a new text field for "examDate".
   - Expected result: A new text field appears. The designer positions it, sets the label, and configures the style. The field appears in the left panel's field list.

6. Undo the last change (adding "examDate").
   - Expected result: The "examDate" field is removed from the canvas and left panel. The state reverts to before the field was added.

7. Redo the undone change.
   - Expected result: The "examDate" field reappears in its configured position and style.

8. Save the template (overwriting the original file).
   - Expected result: The `.tgbl` file is updated with all modifications. A success toast/message confirms the save.

## Edge Cases

- What if the `.tgbl` file was created with an older version? --> The UI loads it and displays any version migration notices if applicable.
- What if the background image file is missing from the archive? --> The UI shows a warning "Background image not found" and prompts the designer to re-upload.
- What if undo history is exhausted (no more actions to undo)? --> The undo button/shortcut is disabled or has no effect.
- What if the designer tries to save while a required asset is missing? --> The save is blocked with a prompt to fix the issue.

## Success Criteria

The modified template is saved as a valid `.tgbl` file. Reopening it shows the moved "studentName" field at its new position, the updated font size on "indexNumber", and the new "examDate" field. The undo/redo history operated correctly during the editing session.
