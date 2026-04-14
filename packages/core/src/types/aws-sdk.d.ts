/* eslint-disable @typescript-eslint/no-extraneous-class */
/**
 * Type declaration for optional @aws-sdk/client-s3 dependency.
 * Only needed at runtime if S3StorageProvider is used.
 */
declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: Record<string, unknown>)
    send(command: PutObjectCommand): Promise<unknown>
  }
  export class PutObjectCommand {
    constructor(input: { Bucket: string; Key: string; Body: Buffer; ContentType: string })
  }
}
