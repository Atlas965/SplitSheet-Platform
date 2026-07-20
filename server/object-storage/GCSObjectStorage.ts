/**
 * GCSObjectStorage — Google Cloud Storage via @google-cloud/storage (Priority 2.2).
 * Env: GCS_BUCKET, GOOGLE_APPLICATION_CREDENTIALS (or ADC).
 */
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import type { IObjectStorage } from "./IObjectStorage";

export class GCSObjectStorage implements IObjectStorage {
  readonly providerName = "gcs";
  private storage = new Storage();
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET ?? "";
    if (!this.bucketName) {
      throw new Error("GCS_BUCKET is required when OBJECT_STORAGE_PROVIDER=gcs");
    }
  }

  async getUploadUrl(objectKey?: string): Promise<string> {
    const key = objectKey ?? `uploads/${randomUUID()}`;
    const file = this.storage.bucket(this.bucketName).file(key);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: "application/octet-stream",
    });
    return url;
  }

  async get(objectKey: string): Promise<Buffer> {
    const [buf] = await this.storage.bucket(this.bucketName).file(objectKey).download();
    return Buffer.from(buf);
  }

  async delete(objectKey: string): Promise<void> {
    await this.storage.bucket(this.bucketName).file(objectKey).delete({ ignoreNotFound: true });
  }

  async signedUrl(objectKey: string, ttlSec = 3600): Promise<string> {
    const [url] = await this.storage.bucket(this.bucketName).file(objectKey).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + ttlSec * 1000,
    });
    return url;
  }
}
