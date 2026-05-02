/**
 * PdfPreview — mounts the interactive `PreviewDialog` (#45) when the
 * toolbar's Preview button toggles `showPreview`. The dialog owns the
 * full render flow (JSON editor, image overrides, calling
 * `generatePreviewHtml`, opening the result in a new tab).
 *
 * Before #45 this component auto-ran the renderer on every `showPreview`
 * flip — hard-wired data, no JSON edits, no image swaps. The dialog now
 * sits in front of that pipeline so the preview matches what an SDK
 * consumer would actually see when they call `generatePDF(template, data)`.
 */
import { PreviewDialog } from './PreviewDialog.js'
import { useUiStore } from '../../store/uiStore.js'

export function PdfPreview() {
  const showPreview = useUiStore((s) => s.showPreview)
  const setShowPreview = useUiStore((s) => s.setShowPreview)
  if (!showPreview) return null
  return <PreviewDialog onClose={() => setShowPreview(false)} />
}
