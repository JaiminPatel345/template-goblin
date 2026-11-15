# @template-goblin/ui/src/hooks

Custom React hooks providing global keyboard shortcut handling and URL search query example template autoloading.

## Overview

Encapsulates global application lifecycle hooks, including canvas keyboard shortcuts (delete, copy, paste, undo, redo, nudging) and URL-based template loading for interactive demos.

## Interface

- `useKeyboard(): void`: Binds global keyboard shortcuts for selection manipulation and history traversal
- `useExampleLoader(): void`: Detects URL query parameters (e.g. `?example=...`) to load sample templates on launch
- `loadExampleFromSearch(search: string, baseUrl?: string): Promise<boolean>`: Fetches and mounts sample template

## Invariants

- **Input Guard**: Keyboard shortcuts are suppressed when input, textarea, or contentEditable elements have focus.
- **Hydration Synchronization**: Example template loading waits for IndexedDB hydration to finish before loading templates.

## Side Effects

- Binds and unbinds `keydown` event listeners on `window`.
- Executes HTTP fetch requests to retrieve remote `.tgbl` template examples into `templateStore`.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
