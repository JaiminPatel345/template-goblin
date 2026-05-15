/**
 * AlignButtonGroup — three-button selector used by TextFieldProps for
 * horizontal + vertical alignment. Extracted from `TextFieldProps.tsx`
 * per Hard Rule #11 (split as you touch).
 */
export function AlignButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {options.map((opt) => (
        <button
          key={opt}
          className={`tg-btn ${value === opt ? 'tg-btn--active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '4px 6px' }}
          onClick={() => onChange(opt)}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  )
}
