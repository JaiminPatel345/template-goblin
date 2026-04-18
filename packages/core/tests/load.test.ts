import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { loadTemplate } from '../src/load.js'
import type { TemplateManifest } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { dynImage, dynText, makeManifest } from './helpers/fixtures.js'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Build a .tgbl ZIP buffer from a manifest and optional assets. */
function buildTgbl(opts: {
  manifest?: TemplateManifest
  omitManifest?: boolean
  background?: Buffer | null
  fontFiles?: Record<string, Buffer>
}): Buffer {
  const zip = new AdmZip()

  if (!opts.omitManifest) {
    const manifest = opts.manifest ?? makeManifest()
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'))
  }

  if (opts.background) {
    zip.addFile('background.png', opts.background)
  }

  if (opts.fontFiles) {
    for (const [filename, data] of Object.entries(opts.fontFiles)) {
      zip.addFile(filename, data)
    }
  }

  return zip.toBuffer()
}

/* ------------------------------------------------------------------ */
/*  Test suite                                                        */
/* ------------------------------------------------------------------ */

describe('loadTemplate', () => {
  let testDir: string

  beforeAll(() => {
    testDir = join(tmpdir(), `tg-load-test-${randomUUID()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  /** Write bytes to a file inside the test dir and return the full path. */
  function writeTmp(name: string, data: Buffer | string): string {
    const p = join(testDir, name)
    writeFileSync(p, data)
    return p
  }

  // ---- Happy path: valid .tgbl ----------------------------------

  it('should load a valid .tgbl file and return a LoadedTemplate with all assets populated', async () => {
    const fontBuffer = Buffer.from('fake-font-data')
    const bgBuffer = Buffer.from('fake-background-png')

    const nameField = dynText('name', 'name', true)
    nameField.style = {
      ...nameField.style,
      fontId: 'roboto',
      fontFamily: 'Roboto',
      fontSize: 14,
      fontSizeMin: 8,
      snapToGrid: false,
    }

    const manifest = makeManifest({
      fonts: [{ id: 'roboto', name: 'Roboto', filename: 'fonts/Roboto.ttf' }],
      fields: [nameField],
    })

    const tgbl = buildTgbl({
      manifest,
      background: bgBuffer,
      fontFiles: { 'fonts/Roboto.ttf': fontBuffer },
    })
    const p = writeTmp('valid-full.tgbl', tgbl)

    const result = await loadTemplate(p)

    expect(result.manifest).toEqual(manifest)
    expect(result.backgroundImage).toBeInstanceOf(Buffer)
    expect(result.backgroundImage!.length).toBe(bgBuffer.length)
    expect(result.fonts.size).toBe(1)
    expect(result.fonts.get('roboto')).toBeInstanceOf(Buffer)
    expect(result.fonts.get('roboto')!.toString()).toBe('fake-font-data')
    expect(result.placeholders).toBeInstanceOf(Map)
    expect(result.staticImages).toBeInstanceOf(Map)
  })

  // ---- Error: FILE_NOT_FOUND ------------------------------------

  it('should throw FILE_NOT_FOUND when the file does not exist', async () => {
    const fakePath = join(testDir, 'does-not-exist.tgbl')

    await expect(loadTemplate(fakePath)).rejects.toThrow(TemplateGoblinError)
    await expect(loadTemplate(fakePath)).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    })
  })

  // ---- Error: INVALID_FORMAT ------------------------------------

  it('should throw INVALID_FORMAT for a non-ZIP file', async () => {
    const p = writeTmp('not-a-zip.tgbl', 'hello')

    await expect(loadTemplate(p)).rejects.toThrow(TemplateGoblinError)
    await expect(loadTemplate(p)).rejects.toMatchObject({
      code: 'INVALID_FORMAT',
    })
  })

  // ---- Error: MISSING_MANIFEST ----------------------------------

  it('should throw MISSING_MANIFEST when ZIP has no manifest.json', async () => {
    const tgbl = buildTgbl({ omitManifest: true })
    const p = writeTmp('no-manifest.tgbl', tgbl)

    await expect(loadTemplate(p)).rejects.toThrow(TemplateGoblinError)
    await expect(loadTemplate(p)).rejects.toMatchObject({
      code: 'MISSING_MANIFEST',
    })
  })

  // ---- Error: MISSING_ASSET (font) ------------------------------

  it('should throw MISSING_ASSET when manifest references a font file not in ZIP', async () => {
    const manifest = makeManifest({
      fonts: [{ id: 'missing-font', name: 'Ghost', filename: 'fonts/Ghost.ttf' }],
    })

    // Build ZIP with manifest but do NOT include the font file
    const tgbl = buildTgbl({ manifest })
    const p = writeTmp('missing-font.tgbl', tgbl)

    await expect(loadTemplate(p)).rejects.toThrow(TemplateGoblinError)
    await expect(loadTemplate(p)).rejects.toMatchObject({
      code: 'MISSING_ASSET',
    })
  })

  // ---- Background image present ---------------------------------

  it('should populate backgroundImage as a Buffer when background.png is in the archive', async () => {
    const bgData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) // PNG header
    const tgbl = buildTgbl({ background: bgData })
    const p = writeTmp('with-bg.tgbl', tgbl)

    const result = await loadTemplate(p)

    expect(result.backgroundImage).toBeInstanceOf(Buffer)
    expect(result.backgroundImage!.length).toBe(bgData.length)
  })

  // ---- Fonts map populated correctly ----------------------------

  it('should populate the fonts Map with correct id-keyed entries', async () => {
    const font1 = Buffer.from('font-one-bytes')
    const font2 = Buffer.from('font-two-bytes')

    const manifest = makeManifest({
      fonts: [
        { id: 'open-sans', name: 'Open Sans', filename: 'fonts/OpenSans.ttf' },
        { id: 'lato', name: 'Lato', filename: 'fonts/Lato.ttf' },
      ],
    })

    const tgbl = buildTgbl({
      manifest,
      fontFiles: {
        'fonts/OpenSans.ttf': font1,
        'fonts/Lato.ttf': font2,
      },
    })
    const p = writeTmp('multi-font.tgbl', tgbl)

    const result = await loadTemplate(p)

    expect(result.fonts.size).toBe(2)
    expect(result.fonts.get('open-sans')!.toString()).toBe('font-one-bytes')
    expect(result.fonts.get('lato')!.toString()).toBe('font-two-bytes')
  })

  // ---- No background → backgroundImage is null ------------------

  it('should set backgroundImage to null when no background.png is in the archive', async () => {
    const tgbl = buildTgbl({ background: null })
    const p = writeTmp('no-bg.tgbl', tgbl)

    const result = await loadTemplate(p)

    expect(result.backgroundImage).toBeNull()
  })

  // ---- Placeholder images loaded --------------------------------

  it('should load placeholder images referenced by image fields', async () => {
    const placeholderData = Buffer.from('placeholder-png-bytes')

    const avatarField = dynImage(
      'avatar',
      'avatar',
      false,
      { width: 100, height: 100 },
      undefined,
      { filename: 'placeholders/avatar.png' },
    )

    const manifest = makeManifest({ fields: [avatarField] })

    const zip = new AdmZip()
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'))
    zip.addFile('placeholders/avatar.png', placeholderData)
    const p = writeTmp('with-placeholder.tgbl', zip.toBuffer())

    const result = await loadTemplate(p)

    expect(result.placeholders.size).toBe(1)
    expect(result.placeholders.get('placeholders/avatar.png')!.toString()).toBe(
      'placeholder-png-bytes',
    )
  })

  // ---- MISSING_PLACEHOLDER_IMAGE_FILE ---------------------------

  it('should throw MISSING_PLACEHOLDER_IMAGE_FILE when a placeholder image referenced by a field is missing', async () => {
    const logoField = dynImage(
      'logo',
      'logo',
      false,
      { width: 80, height: 80 },
      { fit: 'contain' },
      { filename: 'placeholders/logo.png' },
    )

    const manifest = makeManifest({ fields: [logoField] })

    // ZIP with manifest but WITHOUT the placeholder file
    const tgbl = buildTgbl({ manifest })
    const p = writeTmp('missing-placeholder.tgbl', tgbl)

    await expect(loadTemplate(p)).rejects.toThrow(TemplateGoblinError)
    await expect(loadTemplate(p)).rejects.toMatchObject({
      code: 'MISSING_PLACEHOLDER_IMAGE_FILE',
    })
  })
})
