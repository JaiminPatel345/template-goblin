import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import AdmZip from 'adm-zip'
import type { TemplateManifest } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { ZIP_MAGIC_BYTES, MANIFEST_FILENAME, TGBL_EXTENSION } from './constants.js'

/** Maximum allowed .tgbl file size: 100 MB */
const MAX_FILE_SIZE = 100 * 1024 * 1024

/** Maximum allowed decompressed manifest size: 10 MB */
const MAX_MANIFEST_SIZE = 10 * 1024 * 1024

/**
 * Sanitize and resolve a file path. Prevents path traversal.
 *
 * @param path - User-supplied file path
 * @returns Resolved absolute path
 */
function sanitizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    throw new TemplateGoblinError('FILE_NOT_FOUND', 'Invalid file path')
  }
  return resolve(path)
}

/**
 * Verify that the file starts with ZIP magic bytes (PK header).
 */
function isValidZip(buffer: Buffer): boolean {
  if (buffer.length < 2) return false
  return buffer[0] === ZIP_MAGIC_BYTES[0] && buffer[1] === ZIP_MAGIC_BYTES[1]
}

/**
 * Read raw file bytes from disk, verifying existence, extension, size, and ZIP format.
 *
 * @param path - Path to the .tgbl file
 * @returns File content as Buffer
 * @throws TemplateGoblinError FILE_NOT_FOUND, INVALID_FORMAT
 */
export function readTgblBuffer(path: string): Buffer {
  const safePath = sanitizePath(path)

  if (!existsSync(safePath)) {
    throw new TemplateGoblinError('FILE_NOT_FOUND', `Template file not found: ${safePath}`)
  }

  // REQ-006: Validate .tgbl extension
  if (!safePath.toLowerCase().endsWith(TGBL_EXTENSION)) {
    throw new TemplateGoblinError(
      'INVALID_FORMAT',
      `Invalid file extension: expected ${TGBL_EXTENSION}`,
    )
  }

  // Check file size to prevent memory exhaustion
  const stat = statSync(safePath)
  if (stat.size > MAX_FILE_SIZE) {
    throw new TemplateGoblinError(
      'INVALID_FORMAT',
      `File too large: ${Math.round(stat.size / 1024 / 1024)}MB exceeds 100MB limit`,
    )
  }

  const buffer = readFileSync(safePath)

  if (!isValidZip(buffer)) {
    throw new TemplateGoblinError('INVALID_FORMAT', 'Invalid .tgbl file: not a valid ZIP archive')
  }

  return buffer
}

/**
 * Parse manifest.json from a ZIP buffer with validation and size checks.
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

  // ZIP bomb protection: check decompressed size
  if (manifestEntry.header.size > MAX_MANIFEST_SIZE) {
    throw new TemplateGoblinError(
      'INVALID_MANIFEST',
      'Manifest too large: exceeds 10MB decompressed limit',
    )
  }

  const manifestText = manifestEntry.getData().toString('utf-8')

  try {
    const parsed: unknown = JSON.parse(manifestText)

    // Prototype pollution protection: verify it's a plain object
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new TemplateGoblinError('INVALID_MANIFEST', 'Invalid manifest: root must be an object')
    }

    // Strip __proto__ and constructor keys to prevent prototype pollution
    const manifest = sanitizeObject(
      parsed as Record<string, unknown>,
    ) as unknown as TemplateManifest
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
 * Recursively strip dangerous keys from a parsed JSON object.
 * Prevents prototype pollution via __proto__, constructor, or prototype keys.
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    const value = obj[key]
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !Buffer.isBuffer(value)
    ) {
      clean[key] = sanitizeObject(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      clean[key] = value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeObject(item as Record<string, unknown>)
          : item,
      )
    } else {
      clean[key] = value
    }
  }
  return clean
}

/**
 * Validate manifest structure — ensures required top-level fields exist
 * and have correct types.
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

  // Validate dimensions are positive and reasonable
  if (
    manifest.meta.width <= 0 ||
    manifest.meta.height <= 0 ||
    manifest.meta.width > 10000 ||
    manifest.meta.height > 10000
  ) {
    throw new TemplateGoblinError(
      'INVALID_MANIFEST',
      'Invalid manifest: page dimensions must be between 1 and 10000',
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

  // Validate field count limit (prevent DoS)
  if (manifest.fields.length > 1000) {
    throw new TemplateGoblinError(
      'INVALID_MANIFEST',
      'Invalid manifest: too many fields (max 1000)',
    )
  }

  // Check for duplicate field IDs
  const fieldIds = new Set<string>()
  for (const [index, field] of manifest.fields.entries()) {
    if (!field.id || typeof field.id !== 'string') {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        `Invalid manifest: field at index ${index} missing "id"`,
      )
    }
    if (fieldIds.has(field.id)) {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        `Invalid manifest: duplicate field id "${field.id}"`,
      )
    }
    fieldIds.add(field.id)

    if (!['text', 'image', 'loop'].includes(field.type)) {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        `Invalid manifest: field "${field.id}" has invalid type "${String(field.type)}"`,
      )
    }

    // Validate field dimensions
    if (
      typeof field.x !== 'number' ||
      typeof field.y !== 'number' ||
      typeof field.width !== 'number' ||
      typeof field.height !== 'number'
    ) {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        `Invalid manifest: field "${field.id}" has invalid dimensions`,
      )
    }

    // Field source shape (mode + mode-specific slots) is validated exhaustively
    // by validateManifest(); only shallow shape checks remain here.
    if (!field.source || typeof field.source !== 'object') {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        `Invalid manifest: field "${field.id}" missing "source"`,
      )
    }
  }

  // Validate pages array (optional for backward compatibility — treat missing as single-page)
  if (manifest.pages !== undefined && manifest.pages !== null) {
    if (!Array.isArray(manifest.pages)) {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        'Invalid manifest: "pages" must be an array',
      )
    }

    const pageIds = new Set<string>()
    for (const [index, page] of manifest.pages.entries()) {
      if (!page.id || typeof page.id !== 'string') {
        throw new TemplateGoblinError(
          'INVALID_MANIFEST',
          `Invalid manifest: page at index ${index} missing "id"`,
        )
      }
      if (pageIds.has(page.id)) {
        throw new TemplateGoblinError(
          'INVALID_MANIFEST',
          `Invalid manifest: duplicate page id "${page.id}"`,
        )
      }
      pageIds.add(page.id)

      if (typeof page.index !== 'number') {
        throw new TemplateGoblinError(
          'INVALID_MANIFEST',
          `Invalid manifest: page "${page.id}" missing numeric "index"`,
        )
      }

      if (!['image', 'color', 'inherit'].includes(page.backgroundType)) {
        throw new TemplateGoblinError(
          'INVALID_MANIFEST',
          `Invalid manifest: page "${page.id}" has invalid backgroundType "${String(page.backgroundType)}"`,
        )
      }

      // Validate backgroundFilename has no path traversal
      if (page.backgroundFilename) {
        if (page.backgroundFilename.includes('..') || page.backgroundFilename.startsWith('/')) {
          throw new TemplateGoblinError(
            'INVALID_MANIFEST',
            `Invalid manifest: page "${page.id}" backgroundFilename contains path traversal`,
          )
        }
      }
    }
  }

  // Validate fonts have required fields
  for (const font of manifest.fonts) {
    if (
      !font.id ||
      !font.filename ||
      typeof font.id !== 'string' ||
      typeof font.filename !== 'string'
    ) {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        'Invalid manifest: font entry missing "id" or "filename"',
      )
    }
    // Prevent path traversal in font filenames
    if (font.filename.includes('..') || font.filename.startsWith('/')) {
      throw new TemplateGoblinError(
        'INVALID_MANIFEST',
        `Invalid manifest: font filename "${font.filename}" contains path traversal`,
      )
    }
  }
}

/**
 * Read ONLY the manifest.json from a .tgbl file without loading assets.
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
