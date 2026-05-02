---
'template-goblin-ui': minor
---

Replace the auto-trigger Preview flow with an interactive dialog (#45).
Clicking Preview now opens a modal that pre-fills a JSON editor with the
same default values the auto-trigger used and lists every dynamic image
field for optional file replacement (PNG / JPEG / WEBP, ≤10 MB). The
existing render pipeline (`generatePreviewHtml`) runs only on Render and
opens the result in a new tab as before. The JSON editor validates on
input — Render is disabled while parse errors are present, and renderer
errors surface inline instead of via `alert()`. ESC, click-outside, ✕
close button, and Cancel all dismiss without rendering. Reset to
defaults restores the auto-generated JSON.
