import { useMemo } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { estimatePdfSize } from '../../utils/sizeEstimator.js'

export function PdfSizeEstimate() {
  const fields = useTemplateStore((s) => s.fields)
  const hasBackground = useTemplateStore((s) => s.backgroundDataUrl !== null)
  const backgroundBuffer = useTemplateStore((s) => s.backgroundBuffer)

  const estimate = useMemo(
    () => estimatePdfSize(fields, hasBackground, backgroundBuffer?.byteLength ?? 0),
    [fields, hasBackground, backgroundBuffer],
  )

  return (
    <div className="tg-panel-section">
      <div className="tg-panel-section-title">PDF Size Estimate</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{estimate}</div>
    </div>
  )
}
