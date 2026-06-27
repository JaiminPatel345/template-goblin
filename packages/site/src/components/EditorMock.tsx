/** A stylized illustration of the visual editor — a CSS-drawn "screenshot"
 *  for the hero. No real asset needed, scales crisply, and stays on-brand. */

export function EditorMock() {
  return (
    <div
      className="mock"
      role="img"
      aria-label="The TemplateGoblin visual editor: a certificate template on the canvas with a selected dynamic name field and a data table."
    >
      <div className="mock-bar">
        <i />
        <i />
        <i />
        <span className="mock-url">template-goblin · certificate.tgbl</span>
      </div>
      <div className="mock-toolbar">
        <span className="mt-btn" />
        <span className="mt-btn" />
        <span className="mt-btn" />
        <span className="mt-spacer" />
        <span className="mt-btn" style={{ width: '60px' }} />
      </div>
      <div className="mock-body">
        <div className="mock-left-panel">
          <span className="pp-label">Field · name</span>
          <span className="pp-field" />
          <span className="pp-label">Font</span>
          <span className="pp-field" />
          <span className="pp-label">Color</span>
          <span className="pp-swatch" />
        </div>
        <div className="mock-canvas">
          <div className="mock-page">
            <div className="mp-logo" />
            <div className="mp-title" />
            <div className="mp-sub" />
            <div className="mp-name" />
            <div className="mp-rows">
              <div className="mp-row head">
                <span className="mp-cell" />
                <span className="mp-cell" />
                <span className="mp-cell" />
              </div>
              <div className="mp-row">
                <span className="mp-cell" />
                <span className="mp-cell" />
                <span className="mp-cell" />
              </div>
              <div className="mp-row">
                <span className="mp-cell" />
                <span className="mp-cell" />
                <span className="mp-cell" />
              </div>
            </div>
          </div>
        </div>
        <div className="mock-right-panel">
          <span className="pp-label">Structure</span>
          <span className="rp-item">Logo</span>
          <span className="rp-item">Title</span>
          <span className="rp-item">Subtitle</span>
          <span className="rp-item on">Name Field</span>
          <span className="rp-item">Table</span>
        </div>
      </div>
    </div>
  )
}
