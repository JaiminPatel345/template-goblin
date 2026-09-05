/**
 * Multi-select dropdown with a search bar for choosing which style properties
 * to override for a condition (#43).
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import type { PropertyMeta } from './propertyDefinitions.js'

interface Props {
  properties: PropertyMeta[]
  selectedPropIds: string[]
  onToggleProperty: (propId: string, enabled: boolean) => void
}

/**
 * Renders a searchable multi-select dropdown for picking style properties.
 */
export function PropertyPickerDropdown({ properties, selectedPropIds, onToggleProperty }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredProperties = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return properties
    return properties.filter(
      (p) => p.label.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    )
  }, [properties, search])

  // Click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 10 }}>
      <button
        type="button"
        className="tg-btn tg-btn--sm"
        data-testid="property-picker-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          padding: '6px 10px',
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          borderRadius: 6,
        }}
      >
        <span>
          + Override Properties {selectedPropIds.length > 0 && `(${selectedPropIds.length})`}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          data-testid="property-picker-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 6,
            boxShadow: 'var(--shadow-popover)',
            zIndex: 100,
            padding: 8,
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {/* Search bar */}
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              className="tg-input"
              data-testid="property-search-input"
              placeholder="Search properties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                fontSize: 11,
                padding: '5px 8px',
                boxSizing: 'border-box',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
              }}
            />
          </div>

          {/* Properties list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredProperties.length === 0 ? (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  padding: '6px 4px',
                  textAlign: 'center',
                }}
              >
                No matching properties
              </div>
            ) : (
              filteredProperties.map((p) => {
                const isSelected = selectedPropIds.includes(p.id)
                return (
                  <label
                    key={p.id}
                    data-testid={`property-option-${p.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      background: isSelected ? 'var(--accent-soft)' : 'transparent',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      data-testid={`property-checkbox-${p.id}`}
                      checked={isSelected}
                      onChange={(e) => onToggleProperty(p.id, e.target.checked)}
                      style={{ cursor: 'pointer', margin: 0, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ flex: 1, color: 'var(--text-primary)' }}>{p.label}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.category}</span>
                  </label>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
