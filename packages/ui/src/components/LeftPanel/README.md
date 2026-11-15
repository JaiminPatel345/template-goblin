# @template-goblin/ui/src/components/LeftPanel

Left sidebar properties inspector for editing field styling, rotation angle, and group attributes for the active selection.

## Overview

Inspects the currently selected canvas field or group, providing controls for coordinate transforms, dimensions, rotation, opacity, and field-type-specific styling.

## Interface

- `PropertiesPanel`: Main inspector sidebar component
- `RotationSection`: Angle slider and numeric input with normalization
- `GroupPropertiesPanel`: Bulk property controls for grouped fields

## Invariants

- **Selection Awareness**: Renders empty prompt or group editor when no single field is selected.
- **Angle Normalization**: Normalizes angle to `[0, 360)` degrees; saves `0` degrees as `null` to minimize serialized manifest size.
- **Scope Agnostic**: Seamlessly inspects body fields, header fields, and footer fields.

## Side Effects

- Commits property, styling, and transform changes directly to `useTemplateStore`.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
