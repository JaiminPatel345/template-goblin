import type { FieldType, TableHeightMode } from '@template-goblin/types'

export interface FieldCreationDraft {
  type: FieldType
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  pageId: string | null
  groupId: string | null
}

export interface PickedImage {
  filename: string
  dataUrl: string
  buffer: ArrayBuffer
}

export type SourceInputs =
  | {
      mode: 'static'
      value: string
      image?: PickedImage
      color?: string
      trim?: boolean
      tableHeightMode?: TableHeightMode
    }
  | {
      mode: 'dynamic'
      jsonKey: string
      required: boolean
      placeholder: string
      trim?: boolean
      tableHeightMode?: TableHeightMode
    }

export interface FieldCreationPopupProps {
  draft: FieldCreationDraft
  initialLabel?: string
  onCancel: () => void
  onConfirm: (label: string, source: SourceInputs) => void
}

export const FIELD_LABELS: Record<FieldType, string> = {
  text: 'Text',
  image: 'Image',
  table: 'Table',
}

export const JSON_KEY_PREFIX: Record<FieldType, string> = {
  text: 'texts.',
  image: 'images.',
  table: 'tables.',
}
