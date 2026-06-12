import React from 'react'
import { PAGE_SIZE_PRESETS, type PageSize } from '@template-goblin/types'
import { OrientationToggle, swapDimensions } from './OrientationToggle.js'

/**
 * Per-field validation of the custom Width / Height inputs (#112).
 * Returns the inline error message for each side, or `null` when valid.
 * `hasError` is a convenience flag callers use to gate the Apply button.
 *
 * Note: only consulted when the picker is in `'custom'` mode; preset and
 * Match/Previous choices have known-good dimensions and never error.
 */
export interface CustomDimValidation {
  widthError: string | null
  heightError: string | null
  hasError: boolean
}

export function validateCustomDims(width: number, height: number): CustomDimValidation {
  const widthError = checkOne(width, 'Width')
  const heightError = checkOne(height, 'Height')
  return { widthError, heightError, hasError: !!(widthError || heightError) }
}

function checkOne(value: number, label: string): string | null {
  if (!Number.isFinite(value)) return `${label} must be a number.`
  if (value < 1) return `${label} must be at least 1 pt.`
  return null
}

/**
 * Reusable page-size radio picker. The "Same as previous" option is shown
 * when `previousSize` is supplied (i.e. on second-and-later pages); when
 * onboarding the very first page there is no previous size, so the prop is
 * omitted and the default selection falls back to A4.
 *
 * The component is fully controlled — callers own the `value` and the
 * custom-width/height inputs so the picker has no internal state.
 */
export type PageSizeChoice = 'previous' | 'match' | PageSize

export interface PageSizePickerProps {
  value: PageSizeChoice
  onChange: (next: PageSizeChoice) => void
  customWidth: number
  customHeight: number
  setCustomWidth: (v: number) => void
  setCustomHeight: (v: number) => void
  previousSize?: { width: number; height: number }
  /**
   * Wording for the `previousSize` radio. Defaults to "Same as previous"
   * (right for add-page flows where the user is creating a NEW page after
   * the current one). The Change Background dialog passes "Same as
   * Current" because, in edit mode, the radio's `previousSize` IS the
   * current page's size — "previous" reads wrong there.
   */
  previousSizeLabel?: string
  /**
   * Natural dimensions of an image the user just uploaded. When supplied,
   * a "Match image" radio renders FIRST in the list — that's the most
   * sensible default for an image-bg page (preserves the image's native
   * aspect ratio, no scaling artefacts on the canvas or in the PDF).
   */
  matchImage?: { width: number; height: number }
}

export function PageSizePicker({
  value,
  onChange,
  customWidth,
  customHeight,
  setCustomWidth,
  setCustomHeight,
  previousSize,
  previousSizeLabel = 'Same as previous',
  matchImage,
}: PageSizePickerProps) {
  const { widthError, heightError } = validateCustomDims(customWidth, customHeight)
  // Effective dimensions of the current choice — drives the orientation
  // toggle and the swap it performs.
  const resolved = resolveChoice(value, customWidth, customHeight, previousSize, matchImage)
  const handleSwapOrientation = () => {
    const swapped = swapDimensions(resolved.width, resolved.height)
    setCustomWidth(swapped.width)
    setCustomHeight(swapped.height)
    // A swapped preset is no longer that named size — land on Custom with the
    // rotated dimensions (the schema has no "A4 landscape").
    onChange('custom')
  }
  const presets: { key: PageSize; label: string }[] = [
    { key: 'A4', label: 'A4 (595 × 842 pt)' },
    { key: 'A3', label: 'A3 (842 × 1191 pt)' },
    { key: 'A5', label: 'A5 (420 × 595 pt)' },
    { key: 'Letter', label: 'Letter (612 × 792 pt)' },
    { key: 'Legal', label: 'Legal (612 × 1008 pt)' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ marginBottom: 8 }}>
        <OrientationToggle
          width={resolved.width}
          height={resolved.height}
          onSwap={handleSwapOrientation}
        />
      </div>
      {matchImage && (
        <Radio
          checked={value === 'match'}
          onChange={() => onChange('match')}
          label={`Match image (${matchImage.width} × ${matchImage.height} pt)`}
        />
      )}
      {previousSize && (
        <Radio
          checked={value === 'previous'}
          onChange={() => onChange('previous')}
          label={`${previousSizeLabel} (${previousSize.width} × ${previousSize.height} pt)`}
        />
      )}
      {presets.map((p) => (
        <Radio
          key={p.key}
          checked={value === p.key}
          onChange={() => onChange(p.key)}
          label={p.label}
        />
      ))}
      <Radio checked={value === 'custom'} onChange={() => onChange('custom')} label="Custom" />
      {/*
        Reserve the slot for the custom width/height inputs even when the
        user has a preset selected, so switching to "Custom" doesn't grow
        the picker (and therefore the parent dialog) — siblings below stay
        in place. `visibility: hidden` keeps the bounding box; the inputs
        skip tab order and pointer events when hidden.
      */}
      <div style={{ minHeight: 60, marginTop: 8 }}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            visibility: value === 'custom' ? 'visible' : 'hidden',
            pointerEvents: value === 'custom' ? 'auto' : 'none',
          }}
          aria-hidden={value !== 'custom'}
        >
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Width (pt)
            </label>
            <input
              className="tg-input"
              type="number"
              min={1}
              value={customWidth}
              onChange={(e) => setCustomWidth(Number(e.target.value))}
              tabIndex={value === 'custom' ? 0 : -1}
              aria-invalid={value === 'custom' && !!widthError}
              aria-describedby={
                value === 'custom' && widthError ? 'page-size-width-error' : undefined
              }
              data-testid="page-size-custom-width"
            />
            {value === 'custom' && widthError && (
              <div
                id="page-size-width-error"
                data-testid="page-size-width-error"
                role="alert"
                style={{ fontSize: 11, color: 'var(--error)', marginTop: 4 }}
              >
                {widthError}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              Height (pt)
            </label>
            <input
              className="tg-input"
              type="number"
              min={1}
              value={customHeight}
              onChange={(e) => setCustomHeight(Number(e.target.value))}
              tabIndex={value === 'custom' ? 0 : -1}
              aria-invalid={value === 'custom' && !!heightError}
              aria-describedby={
                value === 'custom' && heightError ? 'page-size-height-error' : undefined
              }
              data-testid="page-size-custom-height"
            />
            {value === 'custom' && heightError && (
              <div
                id="page-size-height-error"
                data-testid="page-size-height-error"
                role="alert"
                style={{ fontSize: 11, color: 'var(--error)', marginTop: 4 }}
              >
                {heightError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Resolve a PageSizeChoice into concrete (pageSize, width, height). Mirrors
 * `getPageSize` semantics — preset keys consult `PAGE_SIZE_PRESETS`,
 * `'previous'` echoes the supplied previousSize, `'match'` echoes the
 * supplied uploaded-image natural size, `'custom'` uses the inputs.
 */
export function resolveChoice(
  choice: PageSizeChoice,
  customWidth: number,
  customHeight: number,
  previousSize?: { width: number; height: number },
  matchImage?: { width: number; height: number },
): { pageSize: PageSize; width: number; height: number } {
  if (choice === 'match' && matchImage) {
    return { pageSize: 'custom', width: matchImage.width, height: matchImage.height }
  }
  if (choice === 'previous' && previousSize) {
    return { pageSize: 'custom', width: previousSize.width, height: previousSize.height }
  }
  if (choice === 'custom') {
    return { pageSize: 'custom', width: customWidth, height: customHeight }
  }
  if (choice === 'match' || choice === 'previous') {
    // Fallback: no previous size supplied. Treat as A4.
    return { pageSize: 'A4', ...PAGE_SIZE_PRESETS.A4 }
  }
  const preset = PAGE_SIZE_PRESETS[choice]
  return { pageSize: choice, width: preset.width, height: preset.height }
}

function Radio({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 14,
        color: 'var(--text-primary)',
        background: checked ? 'var(--bg-tertiary)' : 'transparent',
        border: checked ? '1px solid var(--accent)' : '1px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        style={{
          width: 16,
          height: 16,
          accentColor: 'var(--accent)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </label>
  )
}
