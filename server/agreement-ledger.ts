import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import {
  licenseRecords,
  type Contract,
} from "@shared/schema";
import { storage } from "./storage";

function generateSlSongId(): string {
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `SL-SONG-${hex}`;
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

/**
 * Sync completed agreement data into the Rights Ledger without overwriting history.
 * - Ownership / split agreements → song_assets + ownership_records (new version)
 * - License agreements → license_records (new version row)
 */
export async function syncAgreementToRightsLedger(
  contractId: string,
  actorId?: string,
): Promise<{
  synced: boolean;
  reason?: string;
  assetId?: string;
  ownershipVersion?: number;
  licenseId?: string;
}> {
  const contract = await storage.getContract(contractId);
  if (!contract) return { synced: false, reason: "Contract not found" };
  if (contract.status !== "signed" && contract.status !== "confirmed") {
    return { synced: false, reason: "Contract is not fully executed" };
  }

  const template = contract.templateId
    ? await storage.getContractTemplate(contract.templateId)
    : await storage.getContractTemplateByType(contract.type);

  const rights = (template?.rightsCategories as string[] | null) ?? [];
  const data = asRecord(contract.data);
  const createdBy = actorId || contract.createdBy;

  const needsOwnership =
    rights.includes("OWNERSHIP") ||
    rights.includes("COMPOSITION") ||
    contract.type === "split-sheet" ||
    Array.isArray(data.collaborators) ||
    Array.isArray(data.ownershipSplit);

  const needsLicense =
    rights.includes("LICENSE") ||
    rights.includes("SYNCHRONIZATION") ||
    (template?.agreementType ?? "").includes("license") ||
    contract.type.includes("license");

  if (!needsOwnership && !needsLicense) {
    return { synced: false, reason: "Template does not map to ledger ownership or license records" };
  }

  let assetId: string | undefined;
  let ownershipVersion: number | undefined;
  let licenseId: string | undefined;

  if (needsOwnership) {
    const title =
      String(data.songTitle || data.recordingTitle || data.title || contract.title || "Untitled").trim();

    const existingAssets = await storage.getSongAssetsByContract(contractId);
    let asset = existingAssets[0];
    if (!asset) {
      asset = await storage.createSongAsset({
        title,
        artistName: String(data.artistName || data.artist || "") || null,
        createdBy,
        contractId,
        status: "active",
        slSongId: generateSlSongId(),
        metadata: {
          source: "agreement_sync",
          contractType: contract.type,
          templateId: contract.templateId,
          templateVersion: contract.templateVersion ?? template?.version ?? null,
        },
      } as any);
    }
    assetId = asset.id;

    const splits = extractOwnershipSplits(contract, data);
    if (splits.length > 0) {
      const prepared = await ensureUserIdsForSplits(splits, createdBy);
      const total = prepared.reduce((s, p) => s + parseFloat(p.ownershipPercentage), 0);
      if (Math.abs(total - 100) <= 0.01) {
        const records = await storage.updateOwnershipSplit(
          asset.id,
          prepared,
          createdBy,
          `Synced from executed agreement ${contract.id} (${contract.type})`,
        );
        ownershipVersion = records[0]?.version;
      }
    }
  }

  if (needsLicense) {
    if (!assetId) {
      const existingAssets = await storage.getSongAssetsByContract(contractId);
      assetId = existingAssets[0]?.id;
    }

    const [latest] = await db
      .select({ maxVersion: sql<number>`coalesce(max(${licenseRecords.version}), 0)` })
      .from(licenseRecords)
      .where(eq(licenseRecords.contractId, contractId));
    const nextVersion = Number(latest?.maxVersion ?? 0) + 1;

    const [row] = await db
      .insert(licenseRecords)
      .values({
        contractId,
        assetId: assetId ?? null,
        licenseType: contract.type,
        licensorName: String(data.licensor || data.partyA || "") || null,
        licenseeName: String(data.licensee || data.partyB || "") || null,
        territory: String(data.territory || "") || null,
        term: String(data.term || "") || null,
        exclusivity: String(data.exclusivity || "") || null,
        rightsGranted: Array.isArray(data.rightsGranted)
          ? (data.rightsGranted as string[])
          : rights,
        fee: data.licenseFee != null || data.fee != null
          ? String(data.licenseFee ?? data.fee)
          : null,
        metadata: {
          source: "agreement_sync",
          templateVersion: contract.templateVersion ?? template?.version ?? null,
        },
        version: nextVersion,
        createdBy,
      })
      .returning();
    licenseId = row.id;
  }

  // Stamp sync marker on contract metadata (non-destructive)
  const meta = asRecord(contract.metadata);
  await storage.updateContract(contractId, {
    metadata: {
      ...meta,
      rightsLedgerSync: {
        at: new Date().toISOString(),
        assetId,
        ownershipVersion,
        licenseId,
      },
    },
  } as Partial<Contract>);

  return { synced: true, assetId, ownershipVersion, licenseId };
}

function extractOwnershipSplits(
  _contract: Contract,
  data: Record<string, unknown>,
): Array<{ name?: string; email?: string; userId?: string; ownershipPercentage: string; role: string }> {
  const fromCollabs = Array.isArray(data.collaborators) ? data.collaborators : [];
  const fromSplit = Array.isArray(data.ownershipSplit) ? data.ownershipSplit : [];
  const rows = [...fromCollabs, ...fromSplit] as any[];

  return rows
    .map((r) => ({
      name: r.name,
      email: r.email,
      userId: r.userId,
      ownershipPercentage: String(r.ownershipPercentage ?? r.percentage ?? r.share ?? ""),
      role: String(r.role || "writer"),
    }))
    .filter((r) => r.ownershipPercentage && !Number.isNaN(parseFloat(r.ownershipPercentage)));
}

async function ensureUserIdsForSplits(
  splits: Array<{ name?: string; email?: string; userId?: string; ownershipPercentage: string; role: string }>,
  fallbackUserId: string,
): Promise<Array<{ userId: string; ownershipPercentage: string; role: string }>> {
  // Prefer collaborator userIds from the contract when available
  return splits.map((s) => ({
    userId: s.userId || fallbackUserId,
    ownershipPercentage: s.ownershipPercentage,
    role: s.role,
  }));
}
