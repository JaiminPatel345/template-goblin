/**
 * PageLayoutPanel — root right-panel UI for the page-wide header / footer /
 * page-number feature (#61).
 *
 * Rendered by `RightPanel` when no field is selected. Composes the three
 * sub-panels (Header, Footer, Page Number) and wires their callbacks to
 * the template store.
 */
import { useTemplateStore } from '../../store/templateStore.js'
import { HeaderFooterSection } from './HeaderFooterSection.js'
import { PageNumberSection } from './PageNumberSection.js'

export function PageLayoutPanel() {
  const header = useTemplateStore((s) => s.header)
  const footer = useTemplateStore((s) => s.footer)
  const pageNumber = useTemplateStore((s) => s.pageNumber)
  const setHeader = useTemplateStore((s) => s.setHeader)
  const setHeaderStyle = useTemplateStore((s) => s.setHeaderStyle)
  const addHeaderField = useTemplateStore((s) => s.addHeaderField)
  const removeHeaderField = useTemplateStore((s) => s.removeHeaderField)
  const setFooter = useTemplateStore((s) => s.setFooter)
  const setFooterStyle = useTemplateStore((s) => s.setFooterStyle)
  const addFooterField = useTemplateStore((s) => s.addFooterField)
  const removeFooterField = useTemplateStore((s) => s.removeFooterField)
  const setPageNumber = useTemplateStore((s) => s.setPageNumber)
  const setPageNumberConfig = useTemplateStore((s) => s.setPageNumberConfig)

  return (
    <>
      <div className="tg-panel-section">
        <div
          className="tg-panel-section-title"
          title="No field selected — page-wide layout settings"
        >
          Page Layout
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Header, footer, and page-number settings apply to every page in the template. Select a
          field to edit its individual properties instead.
        </div>
      </div>

      <HeaderFooterSection
        kind="header"
        band={header}
        onSetBand={setHeader}
        onSetStyle={setHeaderStyle}
        onAddField={addHeaderField}
        onRemoveField={removeHeaderField}
      />

      <HeaderFooterSection
        kind="footer"
        band={footer}
        onSetBand={setFooter}
        onSetStyle={setFooterStyle}
        onAddField={addFooterField}
        onRemoveField={removeFooterField}
      />

      <PageNumberSection
        config={pageNumber}
        hasHeader={!!header}
        hasFooter={!!footer}
        onSet={setPageNumber}
        onPatch={setPageNumberConfig}
      />
    </>
  )
}
