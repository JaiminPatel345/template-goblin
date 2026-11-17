# @template-goblin/site/src/lib

Pure utility functions, syntax tokenization engine, shared link constants, and React browser hooks.

## Overview

Provides shared helper logic for the site package, including a zero-dependency regex tokenizer for code syntax highlighting, document head metadata synchronization hooks, and a scroll-spy hook for documentation heading navigation.

## Interface

- `GITHUB_URL`, `ISSUES_URL`, `NPM_URL`, `NPM_UI_URL`, `AUTHOR_URL`, `STARS_BADGE`, `PLAYGROUND_URL`: Canonical link constants
- `TokenType`: Token type unions (`'comment' | 'string' | 'keyword' | 'number' | 'fn' | 'punct' | 'plain'`)
- `Token`: Token shape containing type and string value
- `tokenize(code: string, lang?: string): Token[]`: Dependency-free regex-based code tokenizer
- `tokenClass(type: TokenType): string | undefined`: Maps token types to CSS class names
- `useDocumentMeta(title: string, description: string): void`: Hook to synchronize document title, meta description, and canonical link
- `TocItem`: Table of contents entry (`{ id: string; text: string }`)
- `useTocSpy(pathname: string): { items: TocItem[]; activeId: string }`: Scroll-spy hook observing `.prose h2` elements with `IntersectionObserver`

## Invariants

- **Deterministic Tokenizer**: `tokenize` is a pure deterministic parser supporting JavaScript, TypeScript, JSON, Shell, and plain text.
- **Base URL Resolution**: `PLAYGROUND_URL` resolves relative to `import.meta.env.BASE_URL` for static hosting support.
- **Idempotent Meta**: `useDocumentMeta` ensures unique meta description and canonical link tags exist before mutating content.
- **TOC Cleanup**: `useTocSpy` generates kebab-case slug IDs for un-identified headings and disconnects the observer on component unmount.

## Side Effects

- `useDocumentMeta`: Modifies `document.title`, `document.head <meta name="description">`, and `<link rel="canonical">`.
- `useTocSpy`: Mounts `IntersectionObserver` on DOM heading elements and assigns element IDs.

## Verification

- Run: `pnpm --filter @template-goblin/site build`
