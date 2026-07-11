import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Users, FolderOpen, Send, BookOpen, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkflowStage {
  id: string;
  label: string;
  complete: boolean;
  href: string;
}

interface WorkflowStatus {
  clients: number;
  projects: number;
  contributors: number;
  pendingConfirmations: number;
  confirmedProjects: number;
  stages: WorkflowStage[];
}

const STAGE_ICONS: Record<string, typeof Users> = {
  intake: Users,
  splits: FolderOpen,
  confirm: Send,
  ledger: BookOpen,
};

export default function WorkflowBanner() {
  const { data, isLoading } = useQuery<WorkflowStatus>({
    queryKey: ["/api/workflow/status"],
    retry: false,
  });

  if (isLoading || !data) return null;

  const allComplete = data.stages.every((s) => s.complete);

  return (
    <div
      className="mb-8 bg-card border border-border rounded-2xl overflow-hidden"
      data-tour="workflow-banner"
    >
      <div className="px-6 py-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Operator Workflow · B2B2C
          </p>
          <h2 className="text-lg font-bold text-foreground">
            {allComplete ? "Your pipeline is active" : "Your launch checklist"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            You manage clients & splits (B2B). Contributors confirm via link — no account needed (B2C).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
            {data.clients} clients
          </span>
          <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
            {data.projects} projects
          </span>
          <span className="px-2.5 py-1 rounded-full bg-muted border border-border">
            {data.contributors} contributors
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {data.stages.map((stage, index) => {
          const Icon = STAGE_ICONS[stage.id] ?? FolderOpen;
          return (
            <Link
              key={stage.id}
              href={stage.href}
              className="flex items-start gap-3 px-5 py-4 hover:bg-muted/40 transition-colors group"
              data-tour={`workflow-stage-${stage.id}`}
            >
              <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                stage.complete ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-muted text-muted-foreground"
              }`}>
                {stage.complete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {index + 1}
                </p>
                <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  {stage.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stage.complete ? "Complete" : "Get started →"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>

      {!allComplete && (
        <div className="px-6 py-3 bg-primary/5 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            New here? Take the 2-minute walkthrough to learn the operator → contributor flow.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              localStorage.removeItem("sl_onboarding_completed");
              localStorage.removeItem("sl_onboarding_step");
              window.dispatchEvent(new CustomEvent("sl-restart-onboarding"));
            }}
            data-tour="start-walkthrough"
          >
            Start walkthrough
          </Button>
        </div>
      )}
    </div>
  );
}
