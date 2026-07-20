/**
 * server/storage/index.ts — object storage factory (Priority 2.2).
 */
import type { IObjectStorage } from "./IObjectStorage";
import { resolveObjectStorageProvider } from "./IObjectStorage";
import { ReplitObjectStorage } from "./ReplitObjectStorage";

let cached: IObjectStorage | null = null;

export function getObjectStorage(): IObjectStorage {
  if (cached) return cached;
  const name = resolveObjectStorageProvider();
  switch (name) {
    case "s3": {
      // Dynamic require so missing AWS SDK doesn't break Replit boots
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { S3ObjectStorage } = require("./S3ObjectStorage") as typeof import("./S3ObjectStorage");
      cached = new S3ObjectStorage();
      break;
    }
    case "gcs": {
      const { GCSObjectStorage } = require("./GCSObjectStorage") as typeof import("./GCSObjectStorage");
      cached = new GCSObjectStorage();
      break;
    }
    case "replit":
    default:
      cached = new ReplitObjectStorage();
      break;
  }
  console.log(`[object-storage] Using OBJECT_STORAGE_PROVIDER=${name}`);
  return cached;
}

export type { IObjectStorage } from "./IObjectStorage";
export { resolveObjectStorageProvider } from "./IObjectStorage";
