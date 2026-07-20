/**
 * S3ObjectStorage — AWS S3 / S3-compatible (Priority 2.2).
 * Env: AWS_REGION, S3_BUCKET, optional AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
 * Requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner (optionalDeps —
 * imported dynamically so Replit installs without them still boot).
 */
import { randomUUID } from "crypto";
import type { IObjectStorage } from "./IObjectStorage";

export class S3ObjectStorage implements IObjectStorage {
  readonly providerName = "s3";
  private bucket: string;
  private region: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";
    this.region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
    if (!this.bucket) {
      throw new Error("S3_BUCKET is required when OBJECT_STORAGE_PROVIDER=s3");
    }
  }

  private async client() {
    const { S3Client } = await import("@aws-sdk/client-s3");
    return new S3Client({ region: this.region });
  }

  async getUploadUrl(objectKey?: string): Promise<string> {
    const key = objectKey ?? `uploads/${randomUUID()}`;
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const s3 = await this.client();
    return getSignedUrl(s3, new PutObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: 900,
    });
  }

  async get(objectKey: string): Promise<Buffer> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.client();
    const out = await s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    const bytes = await out.Body?.transformToByteArray();
    if (!bytes) throw new Error(`S3 object not found: ${objectKey}`);
    return Buffer.from(bytes);
  }

  async delete(objectKey: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.client();
    await s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }

  async signedUrl(objectKey: string, ttlSec = 3600): Promise<string> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const s3 = await this.client();
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }), {
      expiresIn: ttlSec,
    });
  }
}
