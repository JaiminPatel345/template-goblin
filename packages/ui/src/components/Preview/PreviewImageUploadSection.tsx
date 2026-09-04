/**
 * Images upload section inside `PreviewDialog`.
 *
 * Extracted from `PreviewDialog.tsx` to keep that file under the 300-line
 * cap (Hard Rule #11).
 */
import type { ImageField } from '@template-goblin/types'
import { getPlaceholderFilename } from './previewDialogHelpers.js'
import { PreviewImageUploadRow } from './PreviewImageUploadRow.js'

export interface UploadedImage {
  dataUrl: string
}

interface Props {
  dynamicImageFields: ImageField[]
  baseImageDataUrls: Map<string, string>
  imageOverrides: Map<string, UploadedImage>
  uploadError: string | null
  onUpload: (jsonKey: string, file: File) => void
}

/**
 * Renders image upload rows for dynamic image fields within the preview dialog.
 */
export function PreviewImageUploadSection({
  dynamicImageFields,
  baseImageDataUrls,
  imageOverrides,
  uploadError,
  onUpload,
}: Props) {
  if (dynamicImageFields.length === 0) return null

  return (
    <>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginTop: 16,
          marginBottom: 4,
          display: 'block',
        }}
      >
        Images
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dynamicImageFields.map((f) => {
          if (f.source.mode !== 'dynamic') return null
          const jsonKey = f.source.jsonKey
          const placeholder = getPlaceholderFilename(f.source)
          const placeholderThumb = placeholder ? (baseImageDataUrls.get(placeholder) ?? null) : null
          const override = imageOverrides.get(jsonKey)
          return (
            <PreviewImageUploadRow
              key={f.id}
              jsonKey={jsonKey}
              thumbnail={override?.dataUrl ?? placeholderThumb}
              isOverride={!!override}
              onUpload={(file) => onUpload(jsonKey, file)}
            />
          )
        })}
      </div>
      {uploadError && (
        <div
          data-testid="preview-upload-error"
          style={{ color: '#d33', fontSize: 12, marginTop: 6 }}
        >
          {uploadError}
        </div>
      )}
    </>
  )
}
