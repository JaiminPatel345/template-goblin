---
'template-goblin-ui': minor
---

feat(canvas): smart alignment guides while moving fields (Canva/PowerPoint-style)

Render transient pink/cyan guide lines while a field is being dragged when its
edges or centre align with another field's edges/centre or with the page
edges/centre. Magnetic snap within 6 pt (zoom-aware, clamped to 6–24 pt).
Equal-spacing bracket marks appear when the active field sits between two
others with matching gaps. Hold Alt to disable snapping. Guides disappear on
mouse release.

Resize-time snap is intentionally deferred — guides render visually during
resize but the active field's scale is not mutated. (#41)
