---
'@template-goblin/types': minor
'template-goblin': minor
'template-goblin-ui': minor
---

Add table height mode architecture supporting fixed height, single-page dynamic expansion with vertical table clustering and push-down, and multi-page pagination with visual canvas indicators:

- Full page height continuation for multi-page tables respecting header/footer margins.
- Trailing canvas elements render on the same page where the table completes when space is available.
- Canvas renders wavy tilted vertical break lines and unbounded indicator badge for multi-page tables.
- `options.maxRenderPages` safety ceiling defaulting to 500 for multi-page tables.
