/**
 * ReplitObjectStorage — wraps existing ObjectStorageService (Priority 2.2).
 * Default provider; no behavior change on Replit.
 */
import { ObjectStorageService } from "../objectStorage";
import type { IObjectStorage } from "./IObjectStorage";

export class ReplitObjectStorage implements IObjectStorage {
  readonly providerName = "replit";
  private readonly inner = new ObjectStorageService();

  async getUploadUrl(_objectKey?: string): Promise<string> {
    return this.inner.getObjectEntityUploadURL();
  }

  async get(objectKey: string): Promise<Buffer> {
    const file = await this.inner.getObjectEntityFile(objectKey);
    const [buf] = await file.download();
    return Buffer.from(buf);
  }

  async delete(objectKey: string): Promise<void> {
    const file = await this.inner.getObjectEntityFile(objectKey);
    await file.delete({ ignoreNotFound: true });
  }

  async signedUrl(objectKey: string, ttlSec = 3600): Promise<string> {
    // Replit flow uses the object path directly for authenticated downloads;
    // return the normalized entity path as a relative URL when sidecar signing
    // isn't exposed publicly for GET.
    void ttlSec;
    return objectKey.startsWith("/") ? objectKey : `/objects/${objectKey}`;
  }
}
