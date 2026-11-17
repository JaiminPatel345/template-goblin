# @template-goblin/ui/src/store

Zustand state management stores managing template schema, canvas fields, undo/redo history stack, UI preferences, and IndexedDB persistence.

## Overview

Core client-side state architecture for the visual builder. Manages template manifest modifications, historical undo/redo action tracking, selection states, and client-side persistence via IndexedDB.

## Interface

- `useTemplateStore`: Zustand store hook for template manifest, fields, pages, groups, fonts, and background buffers
- `useUiStore`: Zustand store hook for selection state, active tool, zoom, grid, panels, and theme
- `idbGet(key: string): Promise<unknown>`
- `idbSet(key: string, value: unknown): Promise<void>`
- `idbDelete(key: string): Promise<void>`
- `migrateFromLocalStorage(): Promise<void>`
- Types: `TemplateState`, `UiState`, `ActiveTool`, `Theme`

## Invariants

- **Linear History**: State mutations to `templateStore` push immutable snapshots to the history stack for linear undo and redo operations.
- **Quota Resilience**: Uses IndexedDB instead of localStorage to support large embedded images and fonts without hitting quota limits.
- **Finite Coordinates**: All field geometry coordinates are validated and stored as finite numbers.

## Side Effects

- Asynchronously reads and writes template state to IndexedDB database `template-goblin-db`.
- Saves UI settings to `localStorage`.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
