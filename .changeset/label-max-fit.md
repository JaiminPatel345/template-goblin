---
'template-goblin-ui': minor
---

Static and placeholder field labels now render at the largest font size that fits their bounding rectangle and re-fit automatically when the field is resized. The previous implementation clipped labels to a sliver of their intended area (users saw "tiny vertical lines" instead of real text). Switched from `FabricText` + `clipPath` to a centred `Textbox` that wraps to the rect's width, with the font-size ceiling raised so big rects get big type. Closes #12.
