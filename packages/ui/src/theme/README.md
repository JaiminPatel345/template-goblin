# @template-goblin/ui/src/theme

Design tokens, color constants, and selection styling tokens for template field types and canvas elements.

## Overview

Defines standard visual tokens across the editor interface, including field boundary stroke colors (text, image, table), selection highlight metrics, and theme palettes.

## Interface

- `FIELD_COLORS`: Record mapping `FieldType` (`'text' | 'image' | 'table'`) to color tokens
- `SELECTED_STROKE_WIDTH`: Standard boundary line stroke width for active selections
- Type: `FieldColorTokens`

## Invariants

- **Exhaustive Mapping**: Every field type in `FieldType` must have an associated color configuration.
- **Immutability**: All color constants are immutable strings.

## Side Effects

None. Pure constant definitions.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
