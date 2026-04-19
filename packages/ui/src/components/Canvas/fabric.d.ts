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
  }
}
