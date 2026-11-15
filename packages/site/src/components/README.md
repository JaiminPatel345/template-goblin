# @template-goblin/site/src/components

Reusable UI components, icons, doc primitives, code display, and shared layout shells for the documentation and marketing site.

## Overview

This package contains reusable visual components, layout wrappers (`SiteLayout`, `DocsLayout`), interactive syntax-highlighted code blocks, and SVG icons used across the TemplateGoblin marketing and documentation site.

## Interface

- `SiteLayout`: Shell component providing skip-link navigation, sticky Navbar, dynamic Outlet, and site Footer
- `DocsLayout`: Two-column documentation layout with sticky section navigation, nested TOC spy, and prose container
- `DOC_SECTIONS`: Navigable grouped documentation routes and metadata
- `Navbar`: Sticky top navigation with brand logo, docs dropdown, GitHub/npm badges, playground link, and mobile hamburger menu
- `Footer`: Site-wide footer with product, docs, and project links and author attribution
- `CodeBlock`: Syntax-highlighted code block component with window header, copy-to-clipboard button, and token styling
- `DocHeader`: Standard documentation page header updating document title and metadata
- `Callout`: Styled documentation callout box supporting info and warning variants
- `DocNext`: Bottom-of-page previous/next route navigation pagination links
- `DocTable`: Styled, responsive data table component for technical references
- `Icons`: Lightweight inline SVG icon primitives (`ArrowRight`, `ArrowLeft`, `Check`, `ChevronDown`, `Menu`, `Bolt`, `Palette`, `Code`, `Layers`, `Database`, `FileText`, `Globe`, `Sparkles`, `Info`, `Heart`, `GitHub`, `Npm`, `Copy`, `Download`, `OpenSource`)

## Invariants

- **Zero External Icon Libraries**: All icons are rendered as inline SVGs inheriting `currentColor`.
- **Dependency-Free Syntax Highlighting**: `CodeBlock` performs in-memory syntax tokenization without external syntax highlighting libraries.
- **Accessibility**: `SiteLayout` provides skip-to-content links targeting `#main`.
- **TOC Sync**: `DocsLayout` synchronizes nested table of contents strictly with active page path and viewport scroll positions.

## Side Effects

- `CodeBlock`: Writes snippet text to `navigator.clipboard` on button click.
- `Navbar`: Toggles mobile slide-out navigation menu and dropdown open states.
- `DocsLayout`: Monitors window scroll events and active heading intersection via `useTocSpy`.

## Verification

- Run: `pnpm --filter @template-goblin/site build`
