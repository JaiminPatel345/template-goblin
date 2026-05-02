---
'template-goblin-ui': patch
---

Keep image fields anchored to their declared `(x, y)` when the user
switches between pages and returns (#54). Previously the `FabricImage`
child of any image field collapsed to the page's upper-left after a
page-switch round-trip, only snapping back when the user clicked an
element. The fix unifies the async image-load swap between
`createFieldGroup` and `applyFieldToGroup` behind a shared
`swapPlaceholderForImage` helper that performs the reset-to-origin →
add → restore-position dance in both code paths. Adds an e2e regression
suite asserting every field type stays put across multi-page navigation.
