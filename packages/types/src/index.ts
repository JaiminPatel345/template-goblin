export type {
  TemplateManifest,
  TemplateMeta,
  FieldBase,
  FieldDefinition,
  TextField,
  ImageField,
  TableField,
  TextFieldStyle,
  ImageFieldStyle,
  ImageSourceValue,
  ImageFilenameValue,
  ImageColorValue,
  TableFieldStyle,
  TableBorderStyle,
  TableCellRuntimeStyle,
  TableColumn,
  TableRow,
  CellStyle,
  FontDefinition,
  GroupDefinition,
  PageDefinition,
  PageBackgroundType,
  PageSize,
  FieldType,
  TextAlign,
  VerticalAlign,
  FontWeight,
  FontStyle,
  TextDecoration,
  OverflowMode,
  ImageFit,
  PageBand,
  PageBandStyle,
  PageBandDivider,
  PageNumberConfig,
  PageNumberPlacement,
  PageNumberAlign,
  PageNumberNumeralStyle,
  ConditionStyleRule,
  ConditionalStyleConfig,
} from './template.js'
export { toRoman, formatPageNumber, defaultPageNumberConfig } from './pageNumber.js'
export type {
  InputJSON,
  TextInputs,
  TableInputs,
  ImageInputs,
  ImageInput,
  LinkInputs,
} from './input.js'
export type { StaticSource, DynamicSource, FieldSource } from './source.js'
export { isStaticSource, isDynamicSource } from './source.js'
export type { Hyperlink, StaticHyperlink, DynamicHyperlink } from './hyperlink.js'
export { isValidHyperlinkUrl, isStaticHyperlink, isDynamicHyperlink } from './hyperlink.js'
export { isImageFilenameValue, isImageColorValue } from './template.js'
export type { LoadedTemplate, TemplateAssets } from './loaded.js'
export { PAGE_SIZE_PRESETS, getPageSize } from './pageSize.js'
export { isSafeKey } from './safeKey.js'
export { TemplateGoblinError } from './errors.js'
export type { ValidationResult, ValidationError, ValidationErrorCode, ErrorCode } from './errors.js'
