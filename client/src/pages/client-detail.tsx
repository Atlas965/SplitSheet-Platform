import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import OperatorLayout from "@/components/OperatorLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, Mail, Phone, FolderOpen, Plus, ChevronRight,
  AlertCircle, Clock, CheckCircle2, Pencil, Music2,
} from "lucide-react";

interface Client {
  id: string; name: string; email: string | null; phone: string | null;
  type: string; notes: string | null; createdAt: string;
}
interface Project {
  id: string; title: string; songTitle: string; status: string; updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:                { label: "Draft",               color: "bg-gray-100 text-gray-700",    icon: AlertCircle },
  pending_confirmation: { label: "Pending Confirmation", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed:            { label: "Confirmed",            color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  archived:             { label: "Archived",             color: "bg-slate-100 text-slate-500",  icon: FolderOpen },
};

const CLIENT_TYPES = ["artist", "producer", "group", "songwriter", "label"];

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", type: "artist", notes: "" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, isLoading]);

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ["/api/clients", id],
    queryFn: () => fetch(`/api/clients/${id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!id && isAuthenticated,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/clients", id, "projects"],
    queryFn: () => fetch(`/api/clients/${id}/projects`, { credentials: "include" }).then(r => r.json()),
    enabled: !!id && isAuthenticated,
  });

  useEffect(() => {
    if (client) setForm({ name: client.name, email: client.email ?? "", phone: client.phone ?? "", type: client.type, notes: client.notes ?? "" });
  }, [client]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("PATCH", `/api/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditOpen(false);
      toast({ title: "Client Updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
  });

  if (isLoading || clientLoading) return (
    <OperatorLayout>
      <div className="flex justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    </OperatorLayout>
  );

  if (!client) return (
    <OperatorLayout>
      <div className="p-8 text-center text-muted-foreground">Client not found.</div>
    </OperatorLayout>
  );

  const activeProjects  = projects.filter(p => p.status !== "archived");
  const confirmedProjects = projects.filter(p => p.status === "confirmed");

  return (
    <OperatorLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <Link href="/clients" className="hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" /> Clients
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{client.name}</span>
        </div>

        {/* Client header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                {client.name[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{client.name}</h1>
                <Badge className="capitalize mt-1 text-xs">{client.type}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              {client.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{client.email}</div>}
              {client.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{client.phone}</div>}
            </div>
            {client.notes && <p className="mt-2 text-sm text-muted-foreground italic">{client.notes}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} data-testid="button-edit-client">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Projects",    value: projects.length },
            { label: "Active",            value: activeProjects.length },
            { label: "Confirmed",         value: confirmedProjects.length },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Projects list */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Projects</h2>
          <Button asChild size="sm" data-testid="button-new-project-for-client">
            <Link href={`/projects?clientId=${client.id}`}><Plus className="h-3.5 w-3.5 mr-1" /> New Project</Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Music2 className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No projects for this client yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {projects.map(p => {
              const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="hover:shadow-sm transition-all cursor-pointer group" data-testid={`project-row-${p.id}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">🎵 {p.songTitle}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                        <p className="text-[10px] text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString()}</p>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
