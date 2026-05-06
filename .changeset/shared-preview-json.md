---
'template-goblin-ui': patch
---

The right-panel JSON preview and the Preview dialog now share a single
edited JSON across both surfaces (#78). Previously the right-panel
textarea kept the user's edits in local component state, so opening
Preview re-ran `generateExampleJson` and showed the auto-generated
example again — the user's edits silently vanished. The text now lives
in `uiStore.previewJsonText` (transient, not persisted): both
components read from it, both write to it, and the Preview dialog's
Reset button clears the pin so both surfaces revert to the
auto-generated example. The right panel grows a `Reset` button that
appears once the user has pinned a value.
