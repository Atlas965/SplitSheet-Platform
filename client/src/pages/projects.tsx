import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import OperatorLayout from "@/components/OperatorLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen, Plus, Music2, Clock, CheckCircle2, Archive,
  ChevronRight, Search, AlertCircle,
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

interface Client {
  id: string;
  name: string;
  type: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:                { label: "Draft",              color: "bg-gray-100 text-gray-700",   icon: AlertCircle },
  pending_confirmation: { label: "Pending Confirmation", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed:            { label: "Confirmed",          color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  archived:             { label: "Archived",           color: "bg-slate-100 text-slate-600", icon: Archive },
};

const STATUSES = Object.keys(STATUS_CONFIG);

export default function Projects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", songTitle: "", clientId: "", notes: "" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, isLoading]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/projects", { ...data, clientId: data.clientId || null }),
    onSuccess: (project: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowAdd(false);
      setForm({ title: "", songTitle: "", clientId: "", notes: "" });
      navigate(`/projects/${project.id}`);
      toast({ title: "Project Created", description: "Opening split sheet editor…" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create project.", variant: "destructive" }),
  });

  const filtered = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.songTitle.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Group by status for pipeline view
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: projects.filter(p => p.status === s).length }), {} as Record<string, number>);

  const clientMap = clients.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Client>);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <OperatorLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6" /> Projects
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Split sheet jobs — from intake through confirmation
            </p>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-project">
                <Plus className="h-4 w-4 mr-2" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Split Sheet Project</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Project Title *</Label>
                  <Input placeholder="e.g. Midnight Drive Split Sheet" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })} data-testid="input-project-title" />
                </div>
                <div>
                  <Label>Song Title *</Label>
                  <Input placeholder="e.g. Midnight Drive" value={form.songTitle}
                    onChange={e => setForm({ ...form, songTitle: e.target.value })} data-testid="input-project-song" />
                </div>
                <div>
                  <Label>Client (optional)</Label>
                  <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })}>
                    <SelectTrigger data-testid="select-project-client"><SelectValue placeholder="Select a client…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea placeholder="Session details, studio, date…" value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="input-project-notes" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button onClick={() => createMutation.mutate(form)}
                    disabled={!form.title || !form.songTitle || createMutation.isPending}
                    data-testid="button-confirm-project">
                    {createMutation.isPending ? "Creating…" : "Create & Open"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pipeline stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                className={`rounded-xl p-4 text-left transition-all border ${statusFilter === s ? "ring-2 ring-primary" : "border-transparent"} ${cfg.color}`}
                data-testid={`filter-${s}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="text-2xl font-bold">{counts[s] ?? 0}</span>
                </div>
                <p className="text-xs font-medium">{cfg.label}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by project or song title…" value={search}
            onChange={e => setSearch(e.target.value)} data-testid="input-search-projects" />
        </div>

        {/* Project list */}
        {projectsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Music2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">{search || statusFilter !== "all" ? "No projects match" : "No projects yet"}</p>
              {!search && statusFilter === "all" && (
                <p className="text-sm mt-1">Create your first split sheet project to get started.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(project => {
              const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              const client = project.clientId ? clientMap[project.clientId] : null;
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:shadow-md transition-all cursor-pointer group" data-testid={`card-project-${project.id}`}>
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{project.title}</p>
                          <Badge className={`${cfg.color} text-xs`}>{cfg.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          🎵 {project.songTitle}
                          {client && <span className="ml-2">· {client.name}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </OperatorLayout>
  );
}
