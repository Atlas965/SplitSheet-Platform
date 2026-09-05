import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, Mail, Phone, FolderOpen, Plus, ChevronRight,
  AlertCircle, Clock, CheckCircle2, Pencil, Music2, Building2, Trash2, UserPlus,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company?: string | null;
  type: string;
  role?: string;
  notes: string | null;
  defaultOwnershipPercentage?: number | null;
  defaultRoyaltyPercentage?: number | null;
  createdAt: string;
  source?: "roster" | "project";
}
interface Project {
  id: string; title: string; songTitle: string; status: string; updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:                { label: "Draft",               color: "bg-muted text-muted-foreground", icon: AlertCircle },
  pending_confirmation: { label: "Pending Confirmation", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300", icon: Clock },
  confirmed:            { label: "Confirmed",            color: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300", icon: CheckCircle2 },
  archived:             { label: "Archived",             color: "bg-muted text-muted-foreground", icon: FolderOpen },
};

const CLIENT_TYPES = ["artist", "producer", "group", "songwriter", "label", "publisher"];

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", type: "artist", notes: "",
    defaultOwnershipPercentage: "", defaultRoyaltyPercentage: "",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, isLoading]);

  const { data: client, isLoading: clientLoading, isError } = useQuery<Client>({
    queryKey: ["/api/clients", id],
    queryFn: async () => {
      const r = await fetch(`/api/clients/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("Client not found");
      return r.json();
    },
    enabled: !!id && isAuthenticated,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/clients", id, "projects"],
    queryFn: () => fetch(`/api/clients/${id}/projects`, { credentials: "include" }).then(r => r.json()),
    enabled: !!id && isAuthenticated,
  });

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        email: client.email ?? "",
        phone: client.phone ?? "",
        company: client.company ?? "",
        type: client.type || client.role || "artist",
        notes: client.notes ?? "",
        defaultOwnershipPercentage: client.defaultOwnershipPercentage != null ? String(client.defaultOwnershipPercentage) : "",
        defaultRoyaltyPercentage: client.defaultRoyaltyPercentage != null ? String(client.defaultRoyaltyPercentage) : "",
      });
    }
  }, [client]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("PATCH", `/api/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditOpen(false);
      toast({ title: "Client updated" });
    },
    onError: (err: Error) => toast({ title: "Could not update", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/clients/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client deleted" });
      setLocation("/clients");
    },
    onError: (err: Error) => toast({ title: "Could not delete", description: err.message, variant: "destructive" }),
  });

  const saveAsClient = useMutation({
    mutationFn: () => apiRequest("POST", "/api/clients", {
      name: client?.name,
      email: client?.email,
      phone: client?.phone,
      type: client?.type,
      role: client?.role || client?.type,
      notes: client?.notes,
      defaultOwnershipPercentage: client?.defaultOwnershipPercentage,
    }).then((r) => r.json()),
    onSuccess: (created: Client) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Saved as client profile" });
      setLocation(`/clients/${created.id}`);
    },
    onError: (err: Error) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  if (isLoading || clientLoading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (isError || !client) return (
    <div className="p-8 text-center text-muted-foreground">Client not found.</div>
  );

  const isRoster = client.source !== "project";
  const activeProjects  = projects.filter(p => p.status !== "archived");
  const confirmedProjects = projects.filter(p => p.status === "confirmed");

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <Link href="/clients" className="hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" /> Clients
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{client.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                {client.name[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{client.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="capitalize text-xs">{client.type || client.role}</Badge>
                  {!isRoster && <Badge variant="outline" className="text-xs">From project</Badge>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              {client.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{client.email}</div>}
              {client.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{client.phone}</div>}
              {client.company && <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{client.company}</div>}
            </div>
            {(client.defaultOwnershipPercentage != null || client.defaultRoyaltyPercentage != null) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Defaults copied into new projects:
                {client.defaultOwnershipPercentage != null && ` ${client.defaultOwnershipPercentage}% IP`}
                {client.defaultRoyaltyPercentage != null && ` · ${client.defaultRoyaltyPercentage}% royalty`}
              </p>
            )}
            {client.notes && <p className="mt-2 text-sm text-muted-foreground italic">{client.notes}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {isRoster ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} data-testid="button-edit-client">
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} data-testid="button-delete-client">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => saveAsClient.mutate()} disabled={saveAsClient.isPending}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> {saveAsClient.isPending ? "Saving…" : "Save as client"}
              </Button>
            )}
          </div>
        </div>

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

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Projects</h2>
          {isRoster && (
            <Button asChild size="sm" data-testid="button-new-project-for-client">
              <Link href={`/projects?new=1&clientId=${client.id}`}><Plus className="h-3.5 w-3.5 mr-1" /> New Project</Link>
            </Button>
          )}
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div>
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Default IP ownership %</Label>
                <Input type="number" min="0" max="100" step="0.01" value={form.defaultOwnershipPercentage} onChange={e => setForm({ ...form, defaultOwnershipPercentage: e.target.value })} />
              </div>
              <div>
                <Label>Default royalty %</Label>
                <Input type="number" min="0" max="100" step="0.01" value={form.defaultRoyaltyPercentage} onChange={e => setForm({ ...form, defaultRoyaltyPercentage: e.target.value })} />
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">
              Changing this profile does not update rights already recorded on existing projects.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{client.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the reusable profile only. Existing projects and confirmed rights stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete profile"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
