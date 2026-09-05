import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ConfirmationTracker from "@/components/ConfirmationTracker";
import WorkflowStatus from "@/components/WorkflowStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Music2, Plus, Trash2, Send, CheckCircle2, Clock, AlertCircle,
  Copy, MoreVertical, ChevronLeft, Pencil, Archive,
  ExternalLink, FileText, UserPlus,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  songTitle: string;
  clientId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Contributor {
  id: string;
  projectId: string;
  name: string;
  email: string | null;
  role: string;
  pro: string | null;
  ipi: string | null;
  ownershipPercentage: string;
  confirmationToken: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  type: string;
  role?: string;
  email?: string | null;
  defaultOwnershipPercentage?: number | null;
  source?: "roster" | "project";
}

const ROLES = ["producer", "songwriter", "artist", "co-writer", "publisher", "mixer", "arranger", "other"];
const PROS  = ["SOCAN", "BMI", "ASCAP", "PRS", "SESAC", "Other"];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:                { label: "Draft",               color: "bg-gray-100 text-gray-700" },
  pending_confirmation: { label: "Pending Confirmation", color: "bg-yellow-100 text-yellow-700" },
  confirmed:            { label: "Confirmed",            color: "bg-green-100 text-green-700" },
  archived:             { label: "Archived",             color: "bg-slate-100 text-slate-500" },
};

const emptyContrib = { name: "", email: "", role: "songwriter", pro: "", ipi: "", ownershipPercentage: "" };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const [showAddContrib, setShowAddContrib] = useState(false);
  const [editContrib, setEditContrib] = useState<Contributor | null>(null);
  const [deleteContrib, setDeleteContrib] = useState<Contributor | null>(null);
  const [confirmLinks, setConfirmLinks] = useState<{ id: string; name: string; email: string | null; confirmUrl: string; token: string | null }[]>([]);
  const [showLinks, setShowLinks] = useState(false);
  const [contribForm, setContribForm] = useState(emptyContrib);
  const [editProject, setEditProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ title: "", songTitle: "", notes: "" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, isLoading]);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
    queryFn: () => fetch(`/api/projects/${id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!id && isAuthenticated,
  });

  const { data: contributors = [], isLoading: contribLoading } = useQuery<Contributor[]>({
    queryKey: ["/api/projects", id, "contributors"],
    queryFn: () => fetch(`/api/projects/${id}/contributors`, { credentials: "include" }).then(r => r.json()),
    enabled: !!id && isAuthenticated,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });
  const { data: historySuggestions } = useQuery<{
    previousSplitPatterns: { label: string; count: number }[];
    sourceSessions: { projectId: string; title: string; date: string; ownershipPercentage: number }[];
    conflicts: { title: string; reason: string }[];
    disclaimer: string;
  }>({
    queryKey: ["/api/copilot/history-suggestions", contribForm.email, contribForm.name, project?.songTitle],
    queryFn: () => {
      const q = new URLSearchParams();
      if (contribForm.email) q.set("email", contribForm.email);
      if (contribForm.name) q.set("name", contribForm.name);
      if (project?.songTitle) q.set("title", project.songTitle);
      return fetch(`/api/copilot/history-suggestions?${q}`, { credentials: "include" }).then((r) => r.json());
    },
    enabled: isAuthenticated && Boolean(contribForm.email || contribForm.name),
  });

  const { data: recommendationData } = useQuery<{
    recommendations: Array<{
      template: string;
      priority: string;
      required: boolean;
      reason: string;
      riskLevel: string;
      templateRecord?: { name?: string; type?: string } | null;
    }>;
  }>({
    queryKey: [`/api/projects/${id}/recommended-agreements`],
    enabled: !!id && isAuthenticated,
  });

  const clientMap = clients.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Client>);

  useEffect(() => {
    if (project) setProjectForm({ title: project.title, songTitle: project.songTitle, notes: project.notes ?? "" });
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: (data: typeof projectForm) => apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditProject(false);
      toast({ title: "Project Updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/projects/${id}`, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project Archived" });
    },
    onError: () => toast({ title: "Error", description: "Failed to archive.", variant: "destructive" }),
  });

  const saveContributorAsClient = useMutation({
    mutationFn: (c: Contributor) =>
      apiRequest("POST", "/api/clients/from-contributor", {
        projectId: id,
        contributorId: c.id,
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Saved to clients", description: "Copied as a reusable profile. Existing rights were not changed." });
    },
    onError: (err: Error) => toast({ title: "Could not save client", description: err.message, variant: "destructive" }),
  });

  const addContribMutation = useMutation({
    mutationFn: (data: typeof contribForm) => apiRequest("POST", `/api/projects/${id}/contributors`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "contributors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "workflow"] });
      setShowAddContrib(false);
      setContribForm(emptyContrib);
      toast({ title: "Contributor Added" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add contributor.", variant: "destructive" }),
  });

  const updateContribMutation = useMutation({
    mutationFn: ({ contribId, data }: { contribId: string; data: typeof contribForm }) =>
      apiRequest("PATCH", `/api/projects/${id}/contributors/${contribId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "contributors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "workflow"] });
      setEditContrib(null);
      toast({ title: "Contributor Updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
  });

  const removeContribMutation = useMutation({
    mutationFn: (contribId: string) => apiRequest("DELETE", `/api/projects/${id}/contributors/${contribId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "contributors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "workflow"] });
      setDeleteContrib(null);
      toast({ title: "Contributor Removed" });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove.", variant: "destructive" }),
  });

  const resendMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/${id}/resend`, {}).then((r) => r.json()),
    onSuccess: (data: { sent: number; failed: number; skipped: number; truncated?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "contributors"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${id}/confirmations`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "workflow"] });
      toast({
        title: "Pending emails processed",
        description: `${data.sent} sent, ${data.failed} failed, ${data.skipped} skipped.${data.truncated ? " Retry to continue." : ""}`,
      });
    },
    onError: (err: Error) => toast({ title: "Could not resend", description: err.message, variant: "destructive" }),
  });

  const sendConfirmationsMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/${id}/send-confirmations`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "contributors"] });
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${id}/confirmations`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "workflow"] });
      setConfirmLinks(data.contributors);
      setShowLinks(true);
      toast({ title: "Confirmation Links Generated", description: "Share each link with the contributor." });
    },
    onError: () => toast({ title: "Error", description: "Failed to generate links.", variant: "destructive" }),
  });

  // Derived
  const total = contributors.reduce((s, c) => s + parseFloat(c.ownershipPercentage || "0"), 0);
  const isValid = Math.abs(total - 100) < 0.01;
  const confirmedCount = contributors.filter(c => !!c.confirmedAt).length;
  const status = project?.status ?? "draft";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Confirmation link copied to clipboard." });
  };

  const rosterClients = clients.filter((c) => c.source !== "project");

  const applyRosterClient = (clientId: string) => {
    const picked = rosterClients.find((c) => c.id === clientId);
    if (!picked) return;
    setContribForm({
      ...contribForm,
      name: picked.name,
      email: picked.email ?? "",
      role: picked.role || picked.type || contribForm.role,
      ownershipPercentage:
        picked.defaultOwnershipPercentage != null
          ? String(picked.defaultOwnershipPercentage)
          : contribForm.ownershipPercentage,
    });
  };

  const ContribFormFields = () => (
    <div className="space-y-4">
      {historySuggestions && (historySuggestions.previousSplitPatterns?.length > 0 || historySuggestions.conflicts?.length > 0) && (
        <div className="rounded-lg border border-border p-3 text-xs space-y-1">
          <p className="font-medium">Previous split patterns</p>
          {historySuggestions.previousSplitPatterns.map((p) => (
            <p key={p.label}>{p.label} — {p.count} time{p.count === 1 ? "" : "s"}</p>
          ))}
          {historySuggestions.sourceSessions.slice(0, 3).map((s) => (
            <p key={s.projectId} className="text-muted-foreground">{s.title} · {s.ownershipPercentage}%</p>
          ))}
          {historySuggestions.conflicts.map((c) => (
            <p key={c.title} className="text-amber-700 dark:text-amber-300">Potential conflict: {c.reason}</p>
          ))}
          <p className="text-muted-foreground">{historySuggestions.disclaimer}</p>
        </div>
      )}
      {rosterClients.length > 0 && (
        <div>
          <Label>Fill from saved client</Label>
          <Select onValueChange={applyRosterClient}>
            <SelectTrigger aria-label="Fill from saved client">
              <SelectValue placeholder="Copy a client profile…" />
            </SelectTrigger>
            <SelectContent>
              {rosterClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Name *</Label>
          <Input placeholder="Full name" value={contribForm.name}
            onChange={e => setContribForm({ ...contribForm, name: e.target.value })} data-testid="input-contrib-name" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" placeholder="email@example.com" value={contribForm.email}
            onChange={e => setContribForm({ ...contribForm, email: e.target.value })} data-testid="input-contrib-email" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Role *</Label>
          <Select value={contribForm.role} onValueChange={v => setContribForm({ ...contribForm, role: v })}>
            <SelectTrigger data-testid="select-contrib-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ownership %  *</Label>
          <Input type="number" min="0" max="100" step="0.01" placeholder="e.g. 25.00"
            value={contribForm.ownershipPercentage}
            onChange={e => setContribForm({ ...contribForm, ownershipPercentage: e.target.value })}
            data-testid="input-contrib-ownership" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>PRO</Label>
          <Select value={contribForm.pro} onValueChange={v => setContribForm({ ...contribForm, pro: v })}>
            <SelectTrigger data-testid="select-contrib-pro"><SelectValue placeholder="Select PRO…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {PROS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>IPI / CAE #</Label>
          <Input placeholder="9-digit IPI" value={contribForm.ipi}
            onChange={e => setContribForm({ ...contribForm, ipi: e.target.value })} data-testid="input-contrib-ipi" />
        </div>
      </div>
    </div>
  );

  if (isLoading || projectLoading) return (
    <>
      <div className="flex justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    </>
  );

  if (!project) return (
    <>
      <div className="p-8 text-center text-muted-foreground">Project not found.</div>
    </>
  );

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <Link href="/projects" className="hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" /> Projects
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{project.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <Badge className={`${statusCfg.color} text-xs`}>{statusCfg.label}</Badge>
            </div>
            <p className="text-muted-foreground mt-0.5">
              🎵 {project.songTitle}
              {project.clientId && clientMap[project.clientId] && (
                <span className="ml-2">· {clientMap[project.clientId].name}</span>
              )}
            </p>
            {project.notes && <p className="text-sm text-muted-foreground italic mt-1">{project.notes}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-project-actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditProject(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => archiveMutation.mutate()} className="text-muted-foreground">
                <Archive className="mr-2 h-4 w-4" /> Archive Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {id && <WorkflowStatus projectId={id} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Split Sheet / Contributors */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Split Sheet</CardTitle>
                <Dialog open={showAddContrib} onOpenChange={setShowAddContrib}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" data-testid="button-add-contributor">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Contributor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Contributor</DialogTitle></DialogHeader>
                    <ContribFormFields />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline" onClick={() => setShowAddContrib(false)}>Cancel</Button>
                      <Button onClick={() => addContribMutation.mutate(contribForm)}
                        disabled={!contribForm.name || !contribForm.ownershipPercentage || addContribMutation.isPending}
                        data-testid="button-confirm-contributor">
                        {addContribMutation.isPending ? "Adding…" : "Add Contributor"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-3">
                {contribLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : contributors.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Music2 className="h-6 w-6 mx-auto mb-2 opacity-30" />
                    No contributors yet. Add everyone who has a stake in this song.
                  </div>
                ) : (
                  contributors.map(c => (
                    <div key={c.id} className="space-y-1.5" data-testid={`contrib-row-${c.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{c.name}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">{c.role}</Badge>
                          {c.pro && <Badge className="bg-blue-50 text-blue-700 text-[10px]">{c.pro}</Badge>}
                          {c.confirmedAt ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Confirmed
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
                              <Clock className="h-2.5 w-2.5 mr-0.5" /> Pending
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-sm">{parseFloat(c.ownershipPercentage).toFixed(2)}%</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setContribForm({ name: c.name, email: c.email ?? "", role: c.role, pro: c.pro ?? "", ipi: c.ipi ?? "", ownershipPercentage: c.ownershipPercentage });
                                setEditContrib(c);
                              }}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => saveContributorAsClient.mutate(c)}>
                                <UserPlus className="mr-2 h-4 w-4" /> Save as client
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteContrib(c)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <Progress value={parseFloat(c.ownershipPercentage)} className="h-1.5" />
                      {c.email && <p className="text-[11px] text-muted-foreground">{c.email}</p>}
                    </div>
                  ))
                )}

                {/* Ownership validation */}
                {contributors.length > 0 && (
                  <div className={`flex items-center gap-2 text-xs p-2 rounded-lg mt-3 ${isValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {isValid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {isValid ? "Splits total 100% — valid ✓" : `Total is ${total.toFixed(2)}% — must equal 100%`}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions + Confirmation Links */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Recommended Agreements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(recommendationData?.recommendations || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add contributors and roles to receive agreement recommendations.
                  </p>
                ) : (
                  recommendationData!.recommendations.map((rec) => (
                    <div key={rec.template} className="border border-border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {rec.templateRecord?.name || rec.template}
                        </p>
                        <Badge variant={rec.required ? "default" : "secondary"}>
                          {rec.priority}{rec.required ? " · required" : ""}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.reason}</p>
                      <Button asChild size="sm" variant="outline" className="mt-1">
                        <Link href={`/contract/${rec.template}`}>Create</Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Send Confirmations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4" /> Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Once the split sheet is complete and valid, generate confirmation links to send to each contributor.
                  No account required — they just click the link and confirm.
                </p>
                <Button
                  className="w-full"
                  onClick={() => sendConfirmationsMutation.mutate()}
                  disabled={!isValid || contributors.length === 0 || sendConfirmationsMutation.isPending || status === "confirmed"}
                  data-testid="button-send-confirmations"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendConfirmationsMutation.isPending ? "Generating…" : status === "confirmed" ? "All Confirmed ✓" : "Generate Confirmation Links"}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => resendMutation.mutate()}
                  disabled={!isValid || contributors.length === 0 || resendMutation.isPending || status === "confirmed" || status === "archived"}
                  data-testid="button-resend-confirmations"
                >
                  {resendMutation.isPending ? "Sending…" : "Email pending confirmations"}
                </Button>
                {!isValid && contributors.length > 0 && (
                  <p className="text-xs text-red-600">Fix ownership total before sending confirmations.</p>
                )}
              </CardContent>
            </Card>

            {id && project && (
              <div id="rights-capture">
                <ConfirmationTracker contractId={id} contractTitle={project.title || project.songTitle || "Project"} />
              </div>
            )}

            {/* Generated links */}
            {showLinks && confirmLinks.length > 0 && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-800">Confirmation Links Ready</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {confirmLinks.map(link => (
                    <div key={link.id} className="bg-white rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{link.name}</span>
                        {link.email && <span className="text-xs text-muted-foreground">{link.email}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] bg-muted px-2 py-1 rounded flex-1 truncate">{link.confirmUrl}</code>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyLink(link.confirmUrl)}
                          data-testid={`button-copy-link-${link.id}`}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" asChild>
                          <a href={link.confirmUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Existing contributor tokens */}
            {!showLinks && contributors.some(c => c.confirmationToken) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Existing Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {contributors.filter(c => c.confirmationToken).map(c => {
                    const url = `${window.location.origin}/confirm/${c.confirmationToken}`;
                    return (
                      <div key={c.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{c.name}</p>
                          <code className="text-[10px] text-muted-foreground truncate block">{url}</code>
                        </div>
                        <div className="flex items-center gap-1">
                          {c.confirmedAt ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-yellow-600" />
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyLink(url)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Project timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last updated</span>
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="font-medium">{statusCfg.label}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contributors</span>
                  <span>{contributors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Confirmed</span>
                  <span>{confirmedCount} / {contributors.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Project dialog */}
      <Dialog open={editProject} onOpenChange={setEditProject}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project Title</Label>
              <Input value={projectForm.title} onChange={e => setProjectForm({ ...projectForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Song Title</Label>
              <Input value={projectForm.songTitle} onChange={e => setProjectForm({ ...projectForm, songTitle: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={projectForm.notes} onChange={e => setProjectForm({ ...projectForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditProject(false)}>Cancel</Button>
              <Button onClick={() => updateProjectMutation.mutate(projectForm)} disabled={updateProjectMutation.isPending}>
                {updateProjectMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit contributor dialog */}
      <Dialog open={!!editContrib} onOpenChange={o => { if (!o) setEditContrib(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Contributor</DialogTitle></DialogHeader>
          <ContribFormFields />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditContrib(null)}>Cancel</Button>
            <Button onClick={() => updateContribMutation.mutate({ contribId: editContrib!.id, data: contribForm })}
              disabled={updateContribMutation.isPending}>
              {updateContribMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete contributor confirm */}
      <AlertDialog open={!!deleteContrib} onOpenChange={o => { if (!o) setDeleteContrib(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteContrib?.name}"?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-1">This removes them from the split sheet. Remaining splits will need to be adjusted.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => removeContribMutation.mutate(deleteContrib!.id)}
              disabled={removeContribMutation.isPending}>
              {removeContribMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
