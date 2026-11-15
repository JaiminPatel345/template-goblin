# @template-goblin/ui/src/components/icons

Shared inline SVG icon library satisfying the zero external icon dependency rule.

## Overview

Self-contained SVG icon components tailored for the visual builder UI. Eliminates bulky icon library bundles in compliance with project Rule 7 (inline SVGs only).

## Interface

- `CloseIcon(props: SVGProps<SVGSVGElement>): JSX.Element`
- `ImageFrameIcon(props: SVGProps<SVGSVGElement>): JSX.Element`
- `CheckIcon(props: SVGProps<SVGSVGElement>): JSX.Element`
- `TrashIcon(props: SVGProps<SVGSVGElement>): JSX.Element`
- `MoveIcon(props: SVGProps<SVGSVGElement>): JSX.Element`
- `RotateIcon(props: SVGProps<SVGSVGElement>): JSX.Element`

## Invariants

- **Pure SVG**: Components are pure inline SVG elements accepting standard React `SVGProps`.
- **CSS Color Inheritance**: Strokes and fills default to `currentColor` for dark/light theme adaptability.
- **Zero External Dependencies**: Contains no third-party icon packages or binary font assets.

## Side Effects

None. Pure functional rendering components.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
