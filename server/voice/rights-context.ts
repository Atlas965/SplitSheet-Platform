/**
 * Rights graph context retrieval — canonical records beat conversational memory.
 */
import { storage } from "../storage";

export async function retrieveRightsContext(input: {
  userId: string;
  projectId?: string | null;
  contractId?: string | null;
  songQuery?: string | null;
}): Promise<Record<string, unknown> | null> {
  try {
    if (input.contractId || input.projectId) {
      const id = input.contractId || input.projectId!;
      const contract = await storage.getContract(id);
      if (!contract || contract.createdBy !== input.userId) {
        return { available: false, reason: "Agreement not found or not authorized" };
      }
      const collaborators = await storage.getContractCollaborators(id);
      const assets = await storage.getSongAssetsByContract(id);
      let ownership: unknown[] = [];
      if (assets[0]) {
        ownership = await storage.getCurrentOwnershipWithNames(assets[0].id);
      }
      return {
        available: true,
        source: "canonical",
        contract: {
          id: contract.id,
          title: contract.title,
          type: contract.type,
          status: contract.status,
          templateVersion: contract.templateVersion,
        },
        collaborators: collaborators.map((c) => ({
          name: c.name,
          role: c.role,
          ownershipPercentage: c.ownershipPercentage,
          status: c.status,
        })),
        assets: assets.map((a) => ({ id: a.id, title: a.title, slSongId: a.slSongId })),
        ownership,
        disclaimer:
          "This reflects stored SplitSheet records, not a legal determination of ownership.",
      };
    }

    if (input.songQuery) {
      const assets = await storage.getSongAssets(input.userId);
      const match = assets.find((a) =>
        a.title?.toLowerCase().includes(input.songQuery!.toLowerCase()),
      );
      if (!match) {
        return {
          available: false,
          reason: "No matching song asset found in your Rights Ledger for that title.",
        };
      }
      const ownership = await storage.getCurrentOwnershipWithNames(match.id);
      return {
        available: true,
        source: "canonical",
        asset: { id: match.id, title: match.title, slSongId: match.slSongId },
        ownership,
        disclaimer:
          "This reflects stored SplitSheet records, not a legal determination of ownership.",
      };
    }

    return null;
  } catch (err) {
    console.error("[voice/rights-context]", err);
    return { available: false, reason: "Unable to retrieve rights context right now." };
  }
}
