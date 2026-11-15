# @template-goblin/ui/src/components/Toolbar/primitives

Atomic UI building blocks for ribbon-style toolbars, button triggers, and visual control groupings.

## Overview

Provides reusable atomic primitives used across ribbon tab panels, including buttons, segmented groups, dropdown menu triggers, and vertical separators.

## Interface

- `RibbonButton(props: RibbonButtonProps): JSX.Element`
- `RibbonGroup(props: RibbonGroupProps): JSX.Element`
- `MenuButton(props: MenuButtonProps): JSX.Element`
- `MenuSeparator(): JSX.Element`
- Types: `RibbonButtonProps`, `RibbonGroupProps`, `MenuButtonProps`

## Invariants

- **Standard Dimensions**: Ribbon controls adhere to standard vertical height tokens (`--control-height-md`).
- **Tooltip Integration**: Controls with `title` attributes are automatically wrapped in Radix Tooltips with standard hover delays.

## Side Effects

- Mounts Radix Tooltip portals on pointer hover.
- Invokes click handler callbacks.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
