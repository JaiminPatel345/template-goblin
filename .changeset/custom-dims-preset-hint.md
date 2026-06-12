---
'template-goblin-ui': patch
---

Page-size step: when the custom width/height match a known preset, show a
small "Same as A4" hint beneath the inputs (#118). The custom fields pre-fill
with 595 × 842 — which is A4 — but nothing told the user that; the hint now
makes it clear (and reads "Same as A4 (landscape)" for rotated dimensions). It
appears in both the add-page / onboarding picker and the post-image-upload
page-size dialog.
