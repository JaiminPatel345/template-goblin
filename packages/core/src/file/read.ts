import { readFileSync, existsSync } from 'node:fs'
import AdmZip from 'adm-zip'
import type { TemplateManifest } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { ZIP_MAGIC_BYTES, MANIFEST_FILENAME } from './constants.js'

/**
 * Verify that the file starts with ZIP magic bytes (PK header).
 *
 * @param buffer - File content as Buffer
 * @returns true if the file is a valid ZIP
 */
function isValidZip(buffer: Buffer): boolean {
  if (buffer.length < 2) return false
  return buffer[0] === ZIP_MAGIC_BYTES[0] && buffer[1] === ZIP_MAGIC_BYTES[1]
}

/**
 * Read raw file bytes from disk, verifying existence and ZIP format.
 *
 * @param path - Path to the .tgbl file
 * @returns File content as Buffer
 * @throws TemplateGoblinError FILE_NOT_FOUND or INVALID_FORMAT
 */
export function readTgblBuffer(path: string): Buffer {
  if (!existsSync(path)) {
    throw new TemplateGoblinError('FILE_NOT_FOUND', `Template file not found: ${path}`)
  }

  const buffer = readFileSync(path)

  if (!isValidZip(buffer)) {
    throw new TemplateGoblinError('INVALID_FORMAT', 'Invalid .tgbl file: not a valid ZIP archive')
  }

  return buffer
}

/**
 * Parse manifest.json from a ZIP buffer.
 *
 * @param zip - AdmZip instance
 * @returns Parsed TemplateManifest
 * @throws TemplateGoblinError MISSING_MANIFEST or INVALID_MANIFEST
 */
export function parseManifestFromZip(zip: AdmZip): TemplateManifest {
  const manifestEntry = zip.getEntry(MANIFEST_FILENAME)

  if (!manifestEntry) {
    throw new TemplateGoblinError('MISSING_MANIFEST', 'Invalid .tgbl file: missing manifest.json')
  }

  const manifestText = manifestEntry.getData().toString('utf-8')

  try {
    const manifest = JSON.parse(manifestText) as TemplateManifest
    validateManifestStructure(manifest)
    return manifest
  } catch (error) {
    if (error instanceof TemplateGoblinError) throw error
    throw new TemplateGoblinError(
      'INVALID_MANIFEST',
      `Invalid manifest: ${error instanceof Error ? error.message : 'parse error'}`,
    )
  }
}

/**
 * Validate basic manifest structure — ensures required top-level fields exist.
 *
 * @param manifest - Parsed manifest object
 * @throws TemplateGoblinError INVALID_MANIFEST if structure is wrong
 */
function validateManifestStructure(manifest: TemplateManifest): void {
  if (!manifest.version || typeof manifest.version !== 'string') {
    throw new TemplateGoblinError(
      'INVALID_MANIFEST',
      'Invalid manifest: missing or invalid "version"',
    )
  }

  if (!manifest.meta || typeof manifest.meta !== 'object') {
    throw new TemplateGoblinError('INVALID_MANIFEST', 'Invalid manifest: missing "meta" object')
  }

  if (typeof manifest.meta.width !== 'number' || typeof manifest.meta.height !== 'number') {
    throw new TemplateGoblinError(
      'INVALID_MANIFEST',
      'Invalid manifest: "meta.width" and "meta.height" must be numbers',
    )
  }

  if (!Array.isArray(manifest.fields)) {
    throw new TemplateGoblinError('INVALID_MANIFEST', 'Invalid manifest: "fields" must be an array')
  }

  if (!Array.isArray(manifest.fonts)) {
    throw new TemplateGoblinError('INVALID_MANIFEST', 'Invalid manifest: "fonts" must be an array')
  }

  if (!Array.isArray(manifest.groups)) {
    throw new TemplateGoblinError('INVALID_MANIFEST', 'Invalid manifest: "groups" must be an array')
  }

  for (const [index, field] of manifest.fields.entries()) {
    if (!field.id || typeof field.id !== 'string') {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        `Invalid manifest: field at index ${index} missing "id"`,
      )
    }
    if (!['text', 'image', 'loop'].includes(field.type)) {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        `Invalid manifest: field "${field.id}" has invalid type "${field.type}"`,
      )
    }
  }
}

/**
 * Read ONLY the manifest.json from a .tgbl file without loading assets.
 *
 * Fast operation for validation, listing, or metadata inspection.
 *
 * @param path - Path to the .tgbl file
 * @returns Parsed TemplateManifest
 * @throws TemplateGoblinError with code FILE_NOT_FOUND, INVALID_FORMAT, MISSING_MANIFEST, or INVALID_MANIFEST
 */
export async function readManifest(path: string): Promise<TemplateManifest> {
  const buffer = readTgblBuffer(path)
  const zip = new AdmZip(buffer)
  return parseManifestFromZip(zip)
}
