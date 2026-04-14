# Spec 015 — UI PDF Preview

## Status

Draft

## Summary

Defines the PDF preview feature in the template builder UI. A "Preview" button in the toolbar triggers actual PDF generation using the core library's rendering logic and the currently selected JSON preview mode data. The resulting PDF is rendered inline in a resizable side panel that supports minimize, maximize, and open-in-new-tab actions. The preview updates live when the JSON mode or its parameters change, and provides clear loading and error states.

## Requirements

- [ ] REQ-001: Add a "Preview" button to the toolbar that opens the PDF preview panel.
- [ ] REQ-002: Generate an actual PDF using the core library's `generatePDF()` function with the current JSON preview data from Spec 014.
- [ ] REQ-003: Render the generated PDF inline within a side panel using an embedded PDF viewer (e.g., `<iframe>` with a blob URL, or a library such as `react-pdf`).
- [ ] REQ-004: The preview panel MUST be resizable by dragging its left edge (when docked right) or top edge (when docked bottom).
- [ ] REQ-005: The preview panel MUST support three layout actions: minimize (collapse to a thin bar with a restore button), maximize (fill the available workspace area), and open in new tab (open the PDF blob URL in a new browser tab).
- [ ] REQ-006: The preview MUST update live when the JSON preview mode (Default/Max/Min) or repeat count N changes.
- [ ] REQ-007: Display a loading spinner with the text "Generating PDF..." while the PDF is being generated.
- [ ] REQ-008: If PDF generation fails, display the error message in the preview panel with a "Retry" button.
- [ ] REQ-009: The preview panel MUST not block interaction with the canvas or the right panel while open (non-modal).
- [ ] REQ-010: Debounce live preview updates by 500ms after JSON data changes to avoid excessive regeneration.

## Behaviour

### Happy Path

1. User has designed a template with several fields on the canvas.
2. User clicks the "Preview" button in the toolbar.
3. A loading spinner appears in the preview panel with the message "Generating PDF...".
4. The core library generates a PDF using the current JSON preview data (Default mode by default).
5. The PDF is rendered inline in the side panel.
6. User switches the JSON preview mode to Max with N = 10.
7. After a 500ms debounce, the preview panel shows the loading spinner again and regenerates the PDF with the new data.
8. The updated PDF replaces the previous one in the viewer.
9. User clicks "Open in new tab"; the PDF opens in a new browser tab.

### Edge Cases

- If the template has no fields, the preview generates a PDF with only the background image (or a blank page if no background is set). No error is shown.
- If the preview panel is open and the user deletes all fields, the preview regenerates to show the empty template.
- Very large PDFs (many pages due to Max mode with high N) may take several seconds to generate. The loading spinner remains visible for the full duration. If generation exceeds 30 seconds, show a timeout warning: "PDF generation is taking longer than expected. You may continue waiting or cancel."
- Minimizing the preview panel does not cancel an in-progress generation; the result is displayed when the panel is restored.
- Resizing the panel does not trigger PDF regeneration; it only rescales the viewer.
- If the user closes the preview panel and reopens it, the last generated PDF is shown immediately (cached) unless the JSON data has changed since.

### Error Conditions

- `generatePDF()` throws an error (e.g., missing required font, invalid template structure): display the error message in the preview panel with red styling and a "Retry" button.
- Browser does not support inline PDF rendering: fall back to a download link "Download PDF to preview".
- Blob URL creation fails (memory pressure): display "Unable to preview PDF. Try opening in a new tab or reducing template complexity."
- Generation timeout (>30 seconds): show warning with "Cancel" option that aborts the generation and shows "Preview cancelled".

## Input / Output

```typescript
// Preview panel state
interface PdfPreviewState {
  isOpen: boolean
  isLoading: boolean
  layout: 'minimized' | 'normal' | 'maximized'
  panelWidth: number // pixels, for resizable panel
  pdfBlobUrl: string | null
  error: string | null
  lastGeneratedAt: number // timestamp
}

// Preview generation request
interface PreviewRequest {
  templateManifest: TemplateManifest // from Spec 002
  jsonData: Record<string, unknown> // from Spec 014
}

// Preview generation result
interface PreviewResult {
  pdfBuffer: Uint8Array
  pageCount: number
  generationTimeMs: number
}

// React component props
interface PdfPreviewPanelProps {
  state: PdfPreviewState
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onRestore: () => void
  onOpenInNewTab: () => void
  onRetry: () => void
}

// Core function invoked
// (defined in Spec 008, called here with preview data)
function generatePDF(template: LoadedTemplate, data: Record<string, unknown>): Promise<Uint8Array>
```

## Acceptance Criteria

- [ ] AC-001: Clicking the "Preview" button opens the PDF preview panel with a loading spinner.
- [ ] AC-002: After generation completes, the PDF is rendered inline and is visually readable within the panel.
- [ ] AC-003: Changing the JSON preview mode triggers a new PDF generation after a 500ms debounce.
- [ ] AC-004: The preview panel can be resized by dragging its edge, and the PDF viewer scales accordingly.
- [ ] AC-005: Clicking "Minimize" collapses the panel to a thin bar; clicking the restore button on the bar restores it.
- [ ] AC-006: Clicking "Maximize" expands the panel to fill the workspace; clicking restore returns it to its previous size.
- [ ] AC-007: Clicking "Open in new tab" opens the generated PDF in a new browser tab.
- [ ] AC-008: If `generatePDF()` throws, the error message is displayed in the panel with a "Retry" button that re-triggers generation.
- [ ] AC-009: A loading spinner with "Generating PDF..." is visible for the entire duration of PDF generation.
- [ ] AC-010: The canvas and right panel remain interactive while the preview panel is open.
- [ ] AC-011: A template with no fields produces a valid PDF (blank or background-only) without error.

## Dependencies

- Spec 008 — Generate PDF (provides the `generatePDF()` core function)
- Spec 014 — UI JSON Preview (provides the JSON data and mode selection that feeds into preview generation)

## Notes

- The inline PDF viewer technology should be chosen based on browser compatibility. `<iframe>` with blob URLs works in most modern browsers. A library like `react-pdf` (based on PDF.js) provides more control but adds bundle size. The implementation should pick one and document the choice.
- Open question: should the preview support page navigation controls (next/prev page) within the panel, or is scroll-based navigation sufficient?
- Open question: should the preview panel position be configurable (right side vs. bottom)?
- The 500ms debounce is a starting point. If it feels sluggish during testing, it can be reduced to 300ms. If it causes excessive CPU usage, it can be increased to 750ms.
