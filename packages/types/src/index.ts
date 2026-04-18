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
  TableFieldStyle,
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
} from './template.js'
export type { InputJSON, TextInputs, TableInputs, ImageInputs } from './input.js'
export type { StaticSource, DynamicSource, FieldSource } from './source.js'
export { isStaticSource, isDynamicSource } from './source.js'
export type { LoadedTemplate, TemplateAssets } from './loaded.js'
export { TemplateGoblinError } from './errors.js'
export type { ValidationResult, ValidationError, ValidationErrorCode, ErrorCode } from './errors.js'
