---
'template-goblin-ui': minor
---

Add a Portrait/Landscape orientation toggle to the page-size step (#119). The
toggle reflects the current page's orientation (landscape when wider than tall)
and, when you pick the opposite one, swaps the width and height — so a landscape
page no longer needs the dimensions entered by hand. It appears in both the
add-page / onboarding size picker and the page-size dialog shown after a
background image is uploaded; flipping a preset lands on "Custom" with the
rotated dimensions.
