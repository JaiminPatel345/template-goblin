/** ZIP magic bytes — PK header (0x50 0x4B) */
export const ZIP_MAGIC_BYTES = Buffer.from([0x50, 0x4b])

/** Default template file extension */
export const TGBL_EXTENSION = '.tgbl'

/** Manifest filename inside the ZIP archive */
export const MANIFEST_FILENAME = 'manifest.json'

/** Background image filename inside the ZIP archive */
export const BACKGROUND_FILENAME = 'background.png'

/** Fonts directory inside the ZIP archive */
export const FONTS_DIR = 'fonts/'

/** Placeholders directory inside the ZIP archive */
export const PLACEHOLDERS_DIR = 'placeholders/'

/** Static image assets directory inside the ZIP archive */
export const IMAGES_DIR = 'images/'

/** Per-page backgrounds directory inside the ZIP archive */
export const BACKGROUNDS_DIR = 'backgrounds/'

/** Current manifest version */
export const MANIFEST_VERSION = '1.0'
