import { useState, useCallback, useRef, useEffect } from 'react'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  defaultValue?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Number input that allows the user to clear the field while typing.
 *
 * While focused, the input shows the raw string the user is typing.
 * On blur, if the field is empty, it resets to the default value.
 * The store is only updated with valid numbers — never with NaN or empty.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  defaultValue,
  className = 'tg-input',
  style,
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState(String(value))
  const [focused, setFocused] = useState(false)
  const lastCommitted = useRef(value)

  // Sync from external value changes (e.g., undo/redo) only when not focused
  useEffect(() => {
    if (!focused && value !== lastCommitted.current) {
      setLocalValue(String(value))
      lastCommitted.current = value
    }
  }, [value, focused])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      setLocalValue(raw)

      // Only commit valid numbers to the store
      const num = parseFloat(raw)
      if (!isNaN(num)) {
        const clamped = clamp(num, min, max)
        onChange(clamped)
        lastCommitted.current = clamped
      }
      // If empty or invalid, don't update store — wait for blur
    },
    [onChange, min, max],
  )

  const handleBlur = useCallback(() => {
    setFocused(false)
    const num = parseFloat(localValue)
    if (isNaN(num) || localValue.trim() === '') {
      // Reset to default or current store value
      const fallback = defaultValue ?? min ?? value
      setLocalValue(String(fallback))
      onChange(fallback)
      lastCommitted.current = fallback
    } else {
      const clamped = clamp(num, min, max)
      setLocalValue(String(clamped))
      onChange(clamped)
      lastCommitted.current = clamped
    }
  }, [localValue, defaultValue, min, max, value, onChange])

  const handleFocus = useCallback(() => {
    setFocused(true)
  }, [])

  return (
    <input
      type="number"
      className={className}
      style={style}
      value={localValue}
      min={min}
      max={max}
      step={step}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  )
}

function clamp(value: number, min?: number, max?: number): number {
  let result = value
  if (min !== undefined && result < min) result = min
  if (max !== undefined && result > max) result = max
  return result
}
