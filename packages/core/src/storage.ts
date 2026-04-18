import type { LoadedTemplate, InputJSON } from '@template-goblin/types'
import { generatePDF } from './generate.js'

/**
 * Storage provider interface for saving generated PDFs to cloud storage.
 *
 * Implement this interface to integrate with any storage backend (S3, GCS, Azure Blob, etc.).
 */
export interface StorageProvider {
  /**
   * Upload a PDF buffer to storage.
   *
   * @param key - The storage key/path for the file (e.g., "pdfs/result-12345.pdf")
   * @param buffer - The PDF content as a Buffer
   * @param contentType - MIME type (always "application/pdf")
   * @returns The URL or key of the uploaded file
   */
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>
}

/** Options for generating and storing a PDF */
export interface GenerateAndStoreOptions {
  /** Storage key/path for the PDF file */
  key: string
  /** Optional key prefix (e.g., "pdfs/2024/") — prepended to key */
  prefix?: string
}

/** Result of a generate-and-store operation */
export interface StoreResult {
  /** The URL or key returned by the storage provider */
  url: string
  /** Size of the generated PDF in bytes */
  size: number
}

/**
 * Generate a PDF and upload it directly to cloud storage.
 *
 * Avoids writing the PDF to disk — generates in memory and streams to storage.
 *
 * @param template - LoadedTemplate returned by loadTemplate()
 * @param data - Input JSON with texts, images, and tables
 * @param storage - Storage provider implementation
 * @param options - Storage key and optional prefix
 * @returns StoreResult with the URL and file size
 *
 * @example
 * ```ts
 * const s3 = new S3StorageProvider({ bucket: 'my-pdfs', region: 'us-east-1' })
 * const result = await generateAndStore(template, data, s3, { key: 'result-12345.pdf', prefix: 'pdfs/' })
 * console.log(result.url) // "https://my-pdfs.s3.amazonaws.com/pdfs/result-12345.pdf"
 * ```
 */
export async function generateAndStore(
  template: LoadedTemplate,
  data: InputJSON,
  storage: StorageProvider,
  options: GenerateAndStoreOptions,
): Promise<StoreResult> {
  const pdf = await generatePDF(template, data)
  const rawKey = options.prefix ? `${options.prefix}${options.key}` : options.key

  // Sanitize storage key — prevent path traversal
  if (rawKey.includes('..') || rawKey.startsWith('/') || /[<>:"|?*]/.test(rawKey)) {
    throw new Error('Invalid storage key: contains unsafe characters')
  }
  const fullKey = rawKey

  const url = await storage.upload(fullKey, pdf, 'application/pdf')

  return { url, size: pdf.length }
}

/**
 * Example S3-compatible storage provider.
 *
 * Uses the AWS SDK v3 `@aws-sdk/client-s3` package.
 * Install: `npm install @aws-sdk/client-s3`
 *
 * This is a reference implementation — users can create their own StorageProvider.
 */
export class S3StorageProvider implements StorageProvider {
  private bucket: string
  private region: string
  private endpoint?: string
  private credentials?: { accessKeyId: string; secretAccessKey: string }

  constructor(config: {
    bucket: string
    region: string
    endpoint?: string
    credentials?: { accessKeyId: string; secretAccessKey: string }
  }) {
    this.bucket = config.bucket
    this.region = config.region
    this.endpoint = config.endpoint
    this.credentials = config.credentials
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    // Dynamic import to avoid requiring @aws-sdk/client-s3 as a hard dependency
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

    const client = new S3Client({
      region: this.region,
      ...(this.endpoint ? { endpoint: this.endpoint } : {}),
      ...(this.credentials ? { credentials: this.credentials } : {}),
    })

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    )

    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${key}`
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
  }
}
