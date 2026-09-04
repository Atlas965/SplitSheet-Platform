import {
  contributorLimitForTier,
  projectLimitForTier,
} from "./plan-limits";

export type WorkspaceProject = {
  status?: string | null;
  createdAt?: string | Date | null;
};

export type WorkspaceConfirmation = {
  status?: string | null;
};

export function isPendingStatus(status?: string | null): boolean {
  return status === "pending_confirmation" || status === "pending" || status === "sent";
}

export function isConfirmedStatus(status?: string | null): boolean {
  return status === "confirmed" || status === "signed";
}

export function confirmationRate(confirmations: WorkspaceConfirmation[]): number {
  const actionable = confirmations.filter(
    (c) => c.status && c.status !== "revoked" && c.status !== "not_sent",
  );
  if (actionable.length === 0) return 0;
  const confirmed = actionable.filter((c) => c.status === "confirmed").length;
  return Math.round((confirmed / actionable.length) * 100);
}

export function summarizeWorkspace(input: {
  projects: WorkspaceProject[];
  confirmations: WorkspaceConfirmation[];
  clientCount: number;
  contributorCount: number;
  tier?: string | null;
}) {
  const projects = input.projects;
  const drafts = projects.filter((p) => p.status === "draft").length;
  const pending = projects.filter((p) => isPendingStatus(p.status)).length;
  const confirmed = projects.filter((p) => isConfirmedStatus(p.status)).length;
  const projectLimit = projectLimitForTier(input.tier);
  const contributorLimit = contributorLimitForTier(input.tier);

  return {
    totalProjects: projects.length,
    drafts,
    pendingConfirmation: pending,
    confirmed,
    confirmationRate: confirmationRate(input.confirmations),
    clientCount: input.clientCount,
    contributorCount: input.contributorCount,
    plan: {
      tier: input.tier || "free",
      projectLimit,
      contributorLimit,
      projectsUsed: projects.length,
      contributorsUsed: input.contributorCount,
    },
  };
}
