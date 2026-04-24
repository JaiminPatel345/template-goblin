import { LeftPanel as FieldList } from '../LeftPanel/FieldList.js'
import { JsonPreview } from './JsonPreview.js'
import { PdfSizeEstimate } from './PdfSizeEstimate.js'

/**
 * Right-panel content under the new layout (GH #19): the structural view
 * of the template — the field + group list, the JSON preview, and the
 * PDF size estimate. The styling controls moved to the left panel
 * (`PropertiesPanel`). The field list component is still exported as
 * `LeftPanel` from its original file; re-aliased here to avoid a rename.
 */
export function StructurePanel() {
  return (
    <>
      <FieldList />
      <JsonPreview />
      <PdfSizeEstimate />
    </>
  )
}
