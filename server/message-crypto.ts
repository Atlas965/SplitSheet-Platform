/**
 * AES-256-GCM encryption for message content at rest.
 * Uses the shared crypto helpers in security.ts (Node built-in crypto only).
 */
import { encryptField, decryptField } from "./security";

const ENC_PREFIX = "enc:v1:";

export function getMessageEncryptionSecret(): string {
  const secret =
    process.env.FIELD_ENCRYPTION_SECRET || process.env.SESSION_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "FIELD_ENCRYPTION_SECRET is required in production for encrypted messaging",
    );
  }

  return secret || "dev-message-encryption-key-change-me";
}

/** Encrypt plaintext before persisting to the database. */
export function encryptMessageContent(plaintext: string): string {
  const encrypted = encryptField(plaintext, getMessageEncryptionSecret());
  return `${ENC_PREFIX}${encrypted}`;
}

/** Decrypt stored content; legacy plaintext rows pass through unchanged. */
export function decryptMessageContent(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }
  try {
    return decryptField(stored.slice(ENC_PREFIX.length), getMessageEncryptionSecret());
  } catch {
    return "[Unable to decrypt message]";
  }
}

/** Strip sensitive fields before audit/logging. */
export function redactMessageForLog(message: Record<string, unknown>): Record<string, unknown> {
  const { content, ...rest } = message;
  return { ...rest, content: "[redacted]" };
}
