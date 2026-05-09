---
'template-goblin-ui': minor
---

Add a "Format" button to the right-panel JSON Preview header (#85). One click pretty-prints the textarea content with 2-space indentation; `Cmd/Ctrl+Shift+F` does the same from inside the textarea. Invalid JSON surfaces a brief inline error below the textarea (auto-clears after ~3 s) and leaves the user's edits untouched. Clicking Format on the unpinned auto-generated baseline is a no-op so the preview keeps tracking subsequent field-add / field-edit events on the canvas. Multi-line textareas in the right panel no longer auto-select-all on focus, so users can click in to edit one value without the buffer being wiped on the next keystroke.
