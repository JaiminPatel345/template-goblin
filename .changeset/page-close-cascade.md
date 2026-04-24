---
'template-goblin-ui': patch
---

Fix a page-close bug where closing one image-backed page appeared to close every other page too. The canvas background resolver only handled the legacy/solid-colour cases when `currentPageId === null`; after `removePage` the handler set `currentPageId` back to null, and if the remaining page had an image background it was never surfaced — the user saw a blank canvas and read it as "both pages closed, back to onboarding." The resolver now also looks up an explicit `pages[0]` image when no current page is selected, and `handleRemovePage` now lands on whichever page ends up at index 0 instead of dropping to null. New store-level test matrix exercises every two-page background combination (colour/colour, colour/image, image/colour, image/image) × which tab is closed, plus a three-page "close middle" sweep. Closes #23.
