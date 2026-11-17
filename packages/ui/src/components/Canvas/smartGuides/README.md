# @template-goblin/ui/src/components/Canvas/smartGuides

Smart alignment guides engine providing magnetic snapping, visual axis guide lines, and equal-spacing detection for moving and scaling canvas elements.

## Overview

Calculates snap targets, equal-spacing intervals, and renders non-interactive canvas guide overlays during interactive element drag and resize operations on the Fabric.js canvas.

## Interface

- `wireSmartGuides(canvas: FabricCanvas): () => void`
- `buildCandidates(allObjects: FabricObject[], active: FabricObject, page: PageMeta): Candidates`
- `computeSnap(activeRect: Rect, candidates: Candidates, tolerancePt: number): SnapResult`
- `findXSnap(activeRect: Rect, candidates: Candidates, tolerancePt: number): AxisHit | null`
- `findYSnap(activeRect: Rect, candidates: Candidates, tolerancePt: number): AxisHit | null`
- `detectEqualSpacing(activeRect: Rect, siblings: Rect[], tolerancePt: number): SpacingGap[]`
- `snapToleranceForZoom(zoom: number): number`
- Constants: `SNAP_DISTANCE_PT`, `SNAP_DISTANCE_MIN_PT`, `SNAP_DISTANCE_MAX_PT`, `GUIDE_COLOR_OBJECT`, `GUIDE_COLOR_PAGE`, `GUIDE_COLOR_SPACING`, `GUIDE_STROKE_WIDTH`, `SPACING_MATCH_TOLERANCE_PT`
- Types: `Rect`, `Candidates`, `XCandidate`, `YCandidate`, `SnapResult`, `AxisHit`, `SpacingGap`

## Invariants

- **Point Space Coordinates**: Snapping tolerances and coordinates are computed in canvas object-space points (`pt`), never viewport pixels.
- **Boundary Clamping**: Object positions are clamped to page bounds immediately following magnetic snap.
- **Overlay Cleanup**: All visual guide lines and equal-spacing brackets are cleaned up upon mouseup, object modification, or gesture cancellation.

## Side Effects

- Attaches mouse and object lifecycle listeners to Fabric Canvas.
- Renders transient non-interactive guide line overlays on the active Fabric canvas.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
