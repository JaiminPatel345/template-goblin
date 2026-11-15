# @template-goblin/core/src/fonts

Embedded fallback TrueType fonts supporting universal Unicode character ranges with zero external network or filesystem requirements.

## Overview

Provides embedded TrueType font fallbacks (Noto Sans base64-encoded) to guarantee reliable rendering of currency symbols (e.g. ₹), international scripts, and extended Unicode glyphs in environments without local system fonts.

## Interface

- `DEFAULT_UNICODE_FONT_BASE64: string`: Embedded base64 string of fallback Noto Sans font
- `getDefaultUnicodeFont(): Buffer`: Returns cached binary buffer of fallback Unicode font

## Invariants

- **Self-Contained Rendering**: Embeds Noto Sans font for universal character rendering without external runtime network calls or filesystem dependencies.
- **Lazy Singleton**: Lazily instantiates and caches the decoded Buffer singleton on first call.
- **Environment Agnostic**: Compatible with both Node.js and browser runtimes.

## Side Effects

- Mutates module-scoped `cachedBuffer` on first call.

## Verification

- Run: `pnpm --filter template-goblin test`
