---
'template-goblin-ui': patch
---

Drop the ResizeObserver-driven auto-fit zoom on the canvas. With #84's "default 100%" rule, the observer's "snap zoom back to fit when current ≤ fit" behaviour fought the goal: during page refresh the layout settled in stages, the observer fired with a transient container size and snapped zoom to fit, leaving the canvas no longer overflowing the viewport — so no scrollbars appeared even when the page was bigger than the visible area. The canvas now stays at `meta × zoom` regardless of container resizes; users can manually zoom out via the controls if they want a fit-to-viewport view.
