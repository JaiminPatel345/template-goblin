# @template-goblin/ui/src/components/Toolbar

Primary application toolbar header composing menu tabs, ribbons, pinned insertion buttons, action CTAs, and document configuration modals.

## Overview

Top application header housing the main menu bar, context ribbons, quick element insertion shortcuts, undo/redo triggers, preview generation, and global modal triggers.

## Subdirectories & Boundaries

- [primitives](./primitives/README.md): Atomic UI building blocks for ribbon buttons, groups, and separators.
- [ribbons](./ribbons/README.md): Categorized ribbon panels for File, Edit, Insert, Format, View, and Help.

## Interface

- `Toolbar`: Main top-level toolbar container
- `MenuTabBar`: Menu navigation tabs (File, Edit, Insert, Format, View, Help)
- `RibbonBar`: Collapsible container rendering active ribbon panel
- `PageSizeDialog`: Modal for configuring default document page geometry
- `PageLayoutMenu`: Dropdown menu for orientation and page presets
- `BandSettingsModal`: Modal for configuring header and footer band dimensions
- `ResizePageModal`: Page dimension customization dialog
- `FontManager`: Modal for uploading and managing custom TrueType fonts
- `ImageCompressor`: Tool for analyzing and compressing template image assets

## Invariants

- **Adaptive Header**: Renders lightweight onboarding header when template has no configured background or pages.
- **Pinned Access**: Pinned insertion tools (Text, Image, Table) and primary CTAs remain accessible regardless of active ribbon tab.

## Side Effects

- Executes `saveTemplate` and `openTemplate` archive operations.
- Toggles application dark/light theme in `uiStore` and `localStorage`.
- Mounts document modal dialogs for page sizing, fonts, bands, and image compression.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
