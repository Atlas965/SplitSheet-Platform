import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle, FileText, QrCode } from "lucide-react";

type WorkflowStep = { id: string; label: string; done: boolean; current: boolean };
type WorkflowContributor = {
  name: string;
  role: string;
  status: string;
  confirmed: boolean;
  awaiting: boolean;
};
type TimelineItem = { at: string | null; label: string; eventType: string };

export type ProjectWorkflow = {
  state: string;
  label: string;
  steps: WorkflowStep[];
  validation: { valid: boolean; errors: Array<{ code: string; message: string }>; warnings: Array<{ code: string; message: string }> };
  contributors: WorkflowContributor[];
  confirmedPercent: number;
  rightsLedger: { synced: boolean; ownershipVersion?: number | null };
  timeline: TimelineItem[];
  disclaimer: string;
};

function formatTimelineAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} — ${time}`;
}

function contributorStatusLabel(c: WorkflowContributor): string {
  if (c.confirmed) return "Confirmed";
  if (c.status === "change_requested") return "Change requested";
  if (c.status === "revoked") return "Link revoked";
  if (c.status === "sent" || c.status === "not_sent") return "Awaiting confirmation";
  if (c.status === "not_requested") return "Not sent";
  return "Awaiting confirmation";
}

export default function WorkflowStatus({ projectId }: { projectId: string }) {
  const { data } = useQuery<ProjectWorkflow>({
    queryKey: ["/api/projects", projectId, "workflow"],
    queryFn: () => fetch(`/api/projects/${projectId}/workflow`, { credentials: "include" }).then((r) => {
      if (!r.ok) throw new Error("Failed to load workflow");
      return r.json();
    }),
    enabled: !!projectId,
  });

  if (!data) return null;

  return (
    <Card className="mb-6" data-testid="card-workflow-status">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Workflow status</CardTitle>
          <Badge variant="outline" className="text-xs">{data.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-2">
          {data.steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 text-sm">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : step.current ? (
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
              )}
              <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
            </li>
          ))}
        </ol>

        {!data.validation.valid && data.validation.errors.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
            {data.validation.errors[0].message}
          </div>
        )}

        {data.contributors.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Contributor status</p>
            <ul className="space-y-1.5">
              {data.contributors.map((c) => (
                <li key={`${c.name}-${c.role}`} className="flex items-center justify-between text-sm gap-2">
                  <span>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground capitalize"> · {c.role}</span>
                  </span>
                  <span className={`text-xs ${c.confirmed ? "text-green-700" : "text-amber-700"}`}>
                    {c.confirmed ? "✓ " : "⏳ "}
                    {contributorStatusLabel(c)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium">Rights record</span>
            <span className="text-muted-foreground">{data.confirmedPercent}% confirmed</span>
          </div>
          <Progress value={data.confirmedPercent} className="h-2" />
          {data.rightsLedger.synced && (
            <p className="text-xs text-muted-foreground mt-1">
              Saved
              {data.rightsLedger.ownershipVersion != null ? ` (version ${data.rightsLedger.ownershipVersion})` : ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/ownership">
              <FileText className="h-3.5 w-3.5 mr-1" /> View rights
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="#rights-capture">
              <QrCode className="h-3.5 w-3.5 mr-1" /> Generate QR
            </a>
          </Button>
        </div>

        {data.timeline.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Rights activity</p>
            <ul className="space-y-2 border-l pl-3">
              {data.timeline.map((item, i) => (
                <li key={`${item.eventType}-${item.at}-${i}`} className="text-xs">
                  <p className="text-muted-foreground">{formatTimelineAt(item.at)}</p>
                  <p>{item.label}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-snug flex gap-1.5">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          {data.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}
