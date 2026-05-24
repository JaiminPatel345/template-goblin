import { useMemo } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { estimatePdfSize } from '../../utils/sizeEstimator.js'
import { InfoTip } from './InfoTip.js'

export function PdfSizeEstimate() {
  const fields = useTemplateStore((s) => s.fields)
  const hasBackground = useTemplateStore((s) => s.backgroundDataUrl !== null)
  const backgroundBuffer = useTemplateStore((s) => s.backgroundBuffer)

  const estimate = useMemo(
    () => estimatePdfSize(fields, hasBackground, backgroundBuffer?.byteLength ?? 0),
    [fields, hasBackground, backgroundBuffer],
  )

  return (
    <div className="tg-panel-section" data-testid="pdf-size-estimate-section">
      <div className="tg-panel-section-title">
        PDF Size Estimate
        {/* UX-03: the number jumps when image placeholders are added —
         *  explain what's counted so the user isn't surprised. */}
        <InfoTip text="A rough estimate of the final PDF byte size. Counts the page background bitmap and each image placeholder (uploaded thumbnail bytes are reserved even when the user hasn't supplied real data yet). Text and table fields contribute negligible weight." />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{estimate}</div>
    </div>
  )
}
