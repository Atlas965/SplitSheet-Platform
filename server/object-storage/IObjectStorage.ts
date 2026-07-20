/**
 * server/storage/IObjectStorage.ts — Priority 2.2 object storage abstraction.
 */
export interface IObjectStorage {
  /** Return a pre-signed PUT URL for uploading a new object. */
  getUploadUrl(objectKey?: string): Promise<string>;
  /** Download object bytes by path/key. */
  get(objectKey: string): Promise<Buffer>;
  /** Delete an object. */
  delete(objectKey: string): Promise<void>;
  /** Return a pre-signed GET URL. */
  signedUrl(objectKey: string, ttlSec?: number): Promise<string>;
  /** Provider name for diagnostics. */
  readonly providerName: string;
}

export type ObjectStorageProviderName = "replit" | "s3" | "gcs";

export function resolveObjectStorageProvider(): ObjectStorageProviderName {
  const v = process.env.OBJECT_STORAGE_PROVIDER?.toLowerCase();
  if (v === "s3" || v === "gcs" || v === "replit") return v;
  return "replit";
}
