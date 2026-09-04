import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ComponentType } from "react";
import { FolderOpen, Clock, CheckCircle2, Users, Percent, Layers } from "lucide-react";

type WorkspaceAnalytics = {
  totalProjects: number;
  drafts: number;
  pendingConfirmation: number;
  confirmed: number;
  confirmationRate: number;
  clientCount: number;
  contributorCount: number;
  plan: {
    tier: string;
    projectLimit: number | null;
    contributorLimit: number | null;
    projectsUsed: number;
    contributorsUsed: number;
  };
};

function usagePct(used: number, limit: number | null): number {
  if (limit == null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default function Analytics() {
  const { data, isLoading } = useQuery<WorkspaceAnalytics>({
    queryKey: ["/api/analytics/workspace"],
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" />
      </div>
    );
  }

  const plan = data?.plan;
  const projectLimitLabel = plan?.projectLimit == null ? "Unlimited" : `${plan.projectsUsed} / ${plan.projectLimit}`;
  const contribLimitLabel = plan?.contributorLimit == null ? "Unlimited" : `${plan.contributorsUsed} / ${plan.contributorLimit}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workflow metrics for this operator workspace — projects, confirmations, roster, and plan usage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <MetricCard
          title="Projects"
          value={data?.totalProjects ?? 0}
          hint={`${data?.drafts ?? 0} drafts`}
          icon={FolderOpen}
          testId="stat-projects"
        />
        <MetricCard
          title="Pending confirmation"
          value={data?.pendingConfirmation ?? 0}
          hint="Waiting on contributors"
          icon={Clock}
          testId="stat-pending"
        />
        <MetricCard
          title="Confirmed"
          value={data?.confirmed ?? 0}
          hint="Fully confirmed projects"
          icon={CheckCircle2}
          testId="stat-confirmed"
        />
        <MetricCard
          title="Confirmation rate"
          value={`${data?.confirmationRate ?? 0}%`}
          hint="Confirmed links ÷ sent links"
          icon={Percent}
          testId="stat-rate"
        />
        <MetricCard
          title="Clients"
          value={data?.clientCount ?? 0}
          hint="Roster entries you added"
          icon={Users}
          testId="stat-clients"
        />
        <MetricCard
          title="Contributors"
          value={data?.contributorCount ?? 0}
          hint="People on your projects"
          icon={Layers}
          testId="stat-contributors"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan usage</CardTitle>
          <CardDescription>
            Current plan: {plan?.tier === "free" ? "Starter Split" : plan?.tier ?? "free"}. Caps are enforced when you create projects or add contributors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Projects</span>
              <span className="text-muted-foreground">{projectLimitLabel}</span>
            </div>
            <Progress value={usagePct(plan?.projectsUsed ?? 0, plan?.projectLimit ?? null)} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Contributors</span>
              <span className="text-muted-foreground">{contribLimitLabel}</span>
            </div>
            <Progress value={usagePct(plan?.contributorsUsed ?? 0, plan?.contributorLimit ?? null)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  testId,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  testId: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold" data-testid={testId}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
