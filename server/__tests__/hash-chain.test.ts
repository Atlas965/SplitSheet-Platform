import { describe, it, expect } from "vitest";
import {
  sha256,
  canonicalJson,
  computeContentHash,
  canTransition,
  assertTransition,
  computeLockExpiry,
  splitSheetSchema,
  type Collaborator,
} from "../security";

const collabA: Collaborator = { name: "Alice", email: "alice@example.com", role: "writer", ownershipPercentage: 60 };
const collabB: Collaborator = { name: "Bob", email: "bob@example.com", role: "producer", ownershipPercentage: 40 };

describe("security: sha256 + canonical hashing", () => {
  it("produces a deterministic 64-char hex digest", () => {
    const hash = sha256("hello world");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256("hello world")).toBe(hash);
  });

  it("canonicalJson is order-independent (sorted by email)", () => {
    const a = canonicalJson([collabA, collabB]);
    const b = canonicalJson([collabB, collabA]);
    expect(a).toBe(b);
  });

  it("canonicalJson changes when any percentage changes", () => {
    const original = canonicalJson([collabA, collabB]);
    const modified = canonicalJson([{ ...collabA, ownershipPercentage: 61 }, { ...collabB, ownershipPercentage: 39 }]);
    expect(original).not.toBe(modified);
  });
});

describe("security: hash-chained split versioning", () => {
  it("computes the same hash for identical inputs (deterministic)", () => {
    const h1 = computeContentHash("contract-1", 1, [collabA, collabB]);
    const h2 = computeContentHash("contract-1", 1, [collabA, collabB]);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("chains version 2's hash to version 1's hash via prevHash", () => {
    const v1Hash = computeContentHash("contract-1", 1, [collabA, collabB]);
    const v2Hash = computeContentHash("contract-1", 2, [collabA, collabB], v1Hash);
    const v2HashAgain = computeContentHash("contract-1", 2, [collabA, collabB], v1Hash);
    expect(v2Hash).toBe(v2HashAgain);
    expect(v2Hash).not.toBe(v1Hash);
  });

  it("produces a different hash if the prevHash link is broken (tamper detection)", () => {
    const v1Hash = computeContentHash("contract-1", 1, [collabA, collabB]);
    const linkedToV1 = computeContentHash("contract-1", 2, [collabA, collabB], v1Hash);
    const linkedToWrongHash = computeContentHash("contract-1", 2, [collabA, collabB], "deadbeef");
    expect(linkedToV1).not.toBe(linkedToWrongHash);
  });

  it("produces a different hash for a different contract even with identical collaborators", () => {
    const hashA = computeContentHash("contract-A", 1, [collabA, collabB]);
    const hashB = computeContentHash("contract-B", 1, [collabA, collabB]);
    expect(hashA).not.toBe(hashB);
  });
});

describe("security: split state machine", () => {
  it("allows draft -> pending_signatures -> signed -> locked", () => {
    expect(canTransition("draft", "pending_signatures")).toBe(true);
    expect(canTransition("pending_signatures", "signed")).toBe(true);
    expect(canTransition("signed", "locked")).toBe(true);
  });

  it("rejects skipping straight from draft to locked", () => {
    expect(canTransition("draft", "locked")).toBe(false);
    expect(() => assertTransition("draft", "locked")).toThrow(/Invalid state transition/);
  });

  it("treats voided as a terminal state", () => {
    expect(canTransition("voided", "draft")).toBe(false);
    expect(canTransition("voided", "signed")).toBe(false);
  });

  it("allows a locked split to be reopened only via dispute", () => {
    expect(canTransition("locked", "disputed")).toBe(true);
    expect(canTransition("locked", "signed")).toBe(false);
  });

  it("locks a split exactly 48 hours after signing", () => {
    const signedAt = new Date("2026-01-01T00:00:00.000Z");
    const lockExpiry = computeLockExpiry(signedAt);
    expect(lockExpiry.getTime() - signedAt.getTime()).toBe(48 * 60 * 60 * 1000);
  });
});

describe("security: splitSheetSchema validation", () => {
  it("accepts a valid split summing to exactly 100%", () => {
    const result = splitSheetSchema.safeParse({
      contractId: "123e4567-e89b-12d3-a456-426614174000",
      collaborators: [collabA, collabB],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a split that does not sum to 100%", () => {
    const result = splitSheetSchema.safeParse({
      contractId: "123e4567-e89b-12d3-a456-426614174000",
      collaborators: [{ ...collabA, ownershipPercentage: 50 }, { ...collabB, ownershipPercentage: 40 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 collaborators", () => {
    const result = splitSheetSchema.safeParse({
      contractId: "123e4567-e89b-12d3-a456-426614174000",
      collaborators: [{ ...collabA, ownershipPercentage: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid contractId (not a UUID)", () => {
    const result = splitSheetSchema.safeParse({
      contractId: "not-a-uuid",
      collaborators: [collabA, collabB],
    });
    expect(result.success).toBe(false);
  });
});
