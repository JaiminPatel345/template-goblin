---
'template-goblin-ui': patch
---

Native horizontal + vertical scrollbars on the canvas viewport when the
page exceeds the visible area (#66). Pre-fix, zooming past fit just
clipped the page off-screen and only space+drag pan (undiscoverable to
plain users) could reach the hidden edges. The Fabric canvas is now
sized to `pageWidth × zoom × pageHeight × zoom` inside an
`overflow: auto` container, so the browser draws scrollbars natively and
mouse wheel / shift+wheel / trackpad two-finger scroll all work. Space

- drag pan keeps working — it now drives the container's
  `scrollLeft`/`scrollTop` so it tracks the scrollbar position. Window
  resize while zoomed in preserves the user's zoom and scroll position
  (only sub-fit zooms recompute).
