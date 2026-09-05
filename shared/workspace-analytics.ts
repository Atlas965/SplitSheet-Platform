import {
  contributorLimitForTier,
  projectLimitForTier,
} from "./plan-limits";
import { estimatedMinutesSaved, previousPeriodDelta } from "./feature-policy";

export type WorkspaceProject = {
  status?: string | null;
  type?: string | null;
  createdAt?: string | Date | null;
  clientId?: string | null;
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
  now?: number;
  averageConfirmationHours?: number | null;
}) {
  const projects = input.projects;
  const drafts = projects.filter((p) => p.status === "draft").length;
  const pending = projects.filter((p) => isPendingStatus(p.status)).length;
  const confirmed = projects.filter((p) => isConfirmedStatus(p.status)).length;
  const projectLimit = projectLimitForTier(input.tier);
  const contributorLimit = contributorLimitForTier(input.tier);

  const now = input.now ?? Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const twoMonthsAgo = now - 60 * 24 * 60 * 60 * 1000;
  const thisMonth = projects.filter((p) => p.createdAt && new Date(p.createdAt).getTime() >= monthAgo).length;
  const prevMonth = projects.filter((p) => {
    if (!p.createdAt) return false;
    const t = new Date(p.createdAt).getTime();
    return t >= twoMonthsAgo && t < monthAgo;
  }).length;
  const byMonth = new Map<string, number>();
  const byType = new Map<string, number>();
  const byClient = new Map<string, number>();
  for (const p of projects) {
    if (p.createdAt) {
      const key = new Date(p.createdAt).toISOString().slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    const type = p.type || "split-sheet";
    byType.set(type, (byType.get(type) ?? 0) + 1);
    if (p.clientId) byClient.set(p.clientId, (byClient.get(p.clientId) ?? 0) + 1);
  }
  const sessionsOverTime = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));
  const agreementTypes = Array.from(byType.entries()).map(([type, count]) => ({ type, count }));
  const mostActiveClients = Array.from(byClient.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([clientId, count]) => ({ clientId, count }));

  return {
    totalProjects: projects.length,
    drafts,
    pendingConfirmation: pending,
    confirmed,
    sessionsThisMonth: thisMonth,
    sessionsVsPreviousPeriod: previousPeriodDelta(thisMonth, prevMonth),
    averageConfirmationHours: input.averageConfirmationHours ?? null,
    confirmationRate: confirmationRate(input.confirmations),
    clientCount: input.clientCount,
    contributorCount: input.contributorCount,
    sessionsOverTime,
    agreementTypes,
    mostActiveClients,
    estimatedTimeSaved: {
      minutes: estimatedMinutesSaved(confirmed),
      label: "Estimated time saved",
      calculation: "25 minutes per confirmed project versus a typical email/PDF follow-up. This is an estimate, not an industry benchmark.",
    },
    plan: {
      tier: input.tier || "free",
      projectLimit,
      contributorLimit,
      projectsUsed: projects.length,
      contributorsUsed: input.contributorCount,
    },
  };
}
