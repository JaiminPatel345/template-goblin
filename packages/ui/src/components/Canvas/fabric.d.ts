/**
 * Module augmentation for Fabric.js v6 — attaches custom TemplateGoblin
 * properties to Fabric object types so TypeScript allows reading/writing
 * `__fieldId` and `__fieldType` without casting through `any`.
 *
 * These custom properties serve as the join key between the transient Fabric
 * object tree and the canonical `templateStore.fields` array (REQ-048).
 *
 * The empty `import` makes this file a module (not an ambient script), so
 * `declare module 'fabric'` is treated as AUGMENTATION of the installed
 * `fabric` package rather than a fresh declaration that shadows it.
 */
export {}
declare module 'fabric' {
  interface FabricObject {
    /** FieldDefinition.id that this Fabric object represents. */
    __fieldId?: string
    /** FieldDefinition.type ('text' | 'image' | 'table'). */
    __fieldType?: string
    /** Internal flag: marks Fabric objects that are part of the grid overlay. */
    __isGrid?: boolean
    /** Default (un-selected) fill saved on the field's background Rect. */
    __defaultFill?: string
    /** Default (un-selected) stroke saved on the field's background Rect. */
    __defaultStroke?: string
    /** Default (un-selected) strokeWidth saved on the field's background Rect. */
    __defaultStrokeWidth?: number
    /** Source-of-truth width of the field rect, written by `applyFieldToGroup`.
     *  Fabric's Group#width getter includes child bounding-box overhang, so it
     *  cannot be trusted as the intended rect width during drag/resize commit. */
    __fieldWidth?: number
    /** Source-of-truth height of the field rect — see `__fieldWidth`. */
    __fieldHeight?: number
  }
}
