/**
 * QA coverage — archive round-trip for dynamic image placeholders.
 *
 * Mirror of the existing static-image round-trip in `tests/file/write.test.ts`
 * but for the dynamic/placeholder path: `saveTemplate` must emit the file
 * under `placeholders/<filename>` (not under `images/`), and `loadTemplate`
 * must surface the bytes via `loaded.placeholders.get(bareFilename)`.
 */

import AdmZip from 'adm-zip'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import type { TemplateAssets } from '@template-goblin/types'
import { saveTemplate } from '../src/file/write.js'
import { loadTemplate } from '../src/load.js'
import { dynImage, makeManifest } from './helpers/fixtures.js'

let tmpDir: string

beforeAll(() => {
  tmpDir = join(tmpdir(), `tgbl-placeholder-rt-${randomUUID()}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterAll(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

describe('archive round-trip — dynamic image placeholder', () => {
  it('saveTemplate emits placeholders/<filename> entry for dynamic image field', async () => {
    const hintData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xde])
    const field = dynImage(
      'avatar',
      'avatar',
      false,
      { width: 80, height: 80 },
      { fit: 'contain' },
      { filename: 'hint.png' },
    )
    const manifest = makeManifest({ fields: [field] })
    const assets: TemplateAssets = {
      backgroundImage: null,
      pageBackgrounds: new Map(),
      fonts: new Map(),
      placeholders: new Map([['hint.png', hintData]]),
      staticImages: new Map(),
    }
    const outPath = join(tmpDir, 'placeholder-save.tgbl')
    await saveTemplate(manifest, assets, outPath)

    const zip = new AdmZip(outPath)
    const entry = zip.getEntry('placeholders/hint.png')
    expect(entry).not.toBeNull()
    expect(entry!.getData()).toEqual(hintData)

    // Crucially, this file must NOT also appear under images/.
    expect(zip.getEntry('images/hint.png')).toBeNull()
  })

  it('loadTemplate surfaces placeholder bytes under the bare filename', async () => {
    const hintData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03])
    const field = dynImage('avatar', 'avatar', false, { width: 60, height: 60 }, undefined, {
      filename: 'hint.png',
    })
    const manifest = makeManifest({ fields: [field] })
    const assets: TemplateAssets = {
      backgroundImage: null,
      pageBackgrounds: new Map(),
      fonts: new Map(),
      placeholders: new Map([['hint.png', hintData]]),
      staticImages: new Map(),
    }
    const outPath = join(tmpDir, 'placeholder-rt.tgbl')
    await saveTemplate(manifest, assets, outPath)

    const loaded = await loadTemplate(outPath)
    expect(loaded.placeholders.get('hint.png')).toEqual(hintData)
    // And staticImages should be empty (we didn't provide any).
    expect(loaded.staticImages.size).toBe(0)
  })

  it('a template with both static and dynamic images round-trips cleanly', async () => {
    const staticBytes = Buffer.from('static-logo-png')
    const hintBytes = Buffer.from('placeholder-hint-png')

    const manifest = makeManifest({
      fields: [
        dynImage('dyn', 'pic', true, { width: 40, height: 40 }, undefined, {
          filename: 'hint.png',
        }),
        {
          id: 'stat',
          type: 'image',
          label: 'stat',
          groupId: null,
          pageId: null,
          x: 100,
          y: 100,
          width: 60,
          height: 60,
          zIndex: 0,
          style: { fit: 'contain' },
          source: { mode: 'static', value: { filename: 'logo.png' } },
        },
      ],
    })
    const assets: TemplateAssets = {
      backgroundImage: null,
      pageBackgrounds: new Map(),
      fonts: new Map(),
      placeholders: new Map([['hint.png', hintBytes]]),
      staticImages: new Map([['logo.png', staticBytes]]),
    }

    const outPath = join(tmpDir, 'mixed-images.tgbl')
    await saveTemplate(manifest, assets, outPath)

    const zip = new AdmZip(outPath)
    expect(zip.getEntry('placeholders/hint.png')!.getData()).toEqual(hintBytes)
    expect(zip.getEntry('images/logo.png')!.getData()).toEqual(staticBytes)
    // No cross-contamination.
    expect(zip.getEntry('images/hint.png')).toBeNull()
    expect(zip.getEntry('placeholders/logo.png')).toBeNull()

    const loaded = await loadTemplate(outPath)
    expect(loaded.placeholders.get('hint.png')).toEqual(hintBytes)
    expect(loaded.staticImages.get('logo.png')).toEqual(staticBytes)
  })
})
