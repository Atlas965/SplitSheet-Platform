/**
 * server/license-readiness.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Licensing Readiness System (Feature 3) — computes a 0-100 "License Score"
 * for a song asset from its ownership, agreement, metadata, and sample
 * clearance state, so operators can tell at a glance whether a song is ready
 * to be pitched for a sync/licensing opportunity.
 *
 * Weights (sum to 100):
 *   - Ownership complete (active splits sum to 100%)........... 30
 *   - All contributors confirmed/signed......................... 25
 *   - Agreement complete (linked contract is signed)............ 25
 *   - Metadata complete (title + ISRC present).................. 15
 *   - Sample clearance is "clear" or "not_applicable"............ 5
 *
 * Score 100 -> "Ready for licensing"; 75-99 -> "Needs review";
 * below 75 -> "Incomplete rights information".
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { storage } from "./storage";
import type { LicenseReadiness } from "@shared/schema";

export const LICENSE_SCORE_WEIGHTS = {
  ownership: 30,
  contributors: 25,
  agreements: 25,
  metadata: 15,
  sampleClearance: 5,
} as const;

export type LicenseReadinessTier = "ready" | "needs_review" | "incomplete";

export function tierForScore(score: number): LicenseReadinessTier {
  if (score >= 100) return "ready";
  if (score >= 75) return "needs_review";
  return "incomplete";
}

export function tierLabel(tier: LicenseReadinessTier): string {
  switch (tier) {
    case "ready":
      return "Ready for licensing";
    case "needs_review":
      return "Needs review";
    case "incomplete":
      return "Incomplete rights information";
  }
}

/**
 * Recomputes and persists the License Score for a song asset. Safe to call
 * repeatedly (e.g. after any ownership/agreement/metadata change) — it is a
 * pure read-then-upsert, never mutates the underlying ownership/contract data.
 */
export async function recalculateLicenseReadiness(songAssetId: string): Promise<LicenseReadiness> {
  const asset = await storage.getSongAsset(songAssetId);
  if (!asset) {
    throw new Error("Song asset not found");
  }

  const ownership = await storage.getCurrentOwnership(songAssetId);
  const totalPct = ownership.reduce((sum, o) => sum + parseFloat(o.ownershipPercentage), 0);
  const ownershipComplete = ownership.length > 0 && Math.abs(totalPct - 100) < 0.01;

  let agreementsComplete = false;
  let contributorConfirmed = false;
  if (asset.contractId) {
    const [contract, collaborators] = await Promise.all([
      storage.getContract(asset.contractId),
      storage.getContractCollaborators(asset.contractId),
    ]);
    agreementsComplete = contract?.status === "signed";
    contributorConfirmed = collaborators.length > 0 && collaborators.every((c) => c.status === "signed");
  }

  const master = await storage.getMasterAsset(songAssetId);
  const metadataComplete = Boolean(asset.title?.trim()) && Boolean((asset.isrc || master?.isrc)?.trim());

  const existing = await storage.getLicenseReadiness(songAssetId);
  const sampleClearanceStatus = existing?.sampleClearanceStatus ?? "pending";
  const sampleClearanceOk = sampleClearanceStatus === "clear" || sampleClearanceStatus === "not_applicable";

  let licenseScore = 0;
  if (ownershipComplete) licenseScore += LICENSE_SCORE_WEIGHTS.ownership;
  if (contributorConfirmed) licenseScore += LICENSE_SCORE_WEIGHTS.contributors;
  if (agreementsComplete) licenseScore += LICENSE_SCORE_WEIGHTS.agreements;
  if (metadataComplete) licenseScore += LICENSE_SCORE_WEIGHTS.metadata;
  if (sampleClearanceOk) licenseScore += LICENSE_SCORE_WEIGHTS.sampleClearance;

  return await storage.upsertLicenseReadiness(songAssetId, {
    ownershipComplete,
    contributorConfirmed,
    agreementsComplete,
    metadataComplete,
    sampleClearanceStatus,
    licenseScore,
  });
}
