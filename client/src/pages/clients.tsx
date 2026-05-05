import { useEffect, useState } from "react";
import { Link } from "wouter";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Users, Plus, MoreVertical, Mail, Phone, FolderOpen,
  Pencil, Trash2, Search, Music2,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  notes: string | null;
  createdAt: string;
}

const CLIENT_TYPES = ["artist", "producer", "group", "songwriter", "label"];

const typeBadge: Record<string, string> = {
  artist:     "bg-blue-100 text-blue-700",
  producer:   "bg-purple-100 text-purple-700",
  group:      "bg-green-100 text-green-700",
  songwriter: "bg-orange-100 text-orange-700",
  label:      "bg-gray-100 text-gray-700",
};

const emptyForm = { name: "", email: "", phone: "", type: "artist", notes: "" };

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, isLoading]);

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/clients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowAdd(false);
      setForm(emptyForm);
      toast({ title: "Client Added", description: "New client has been created." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create client.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      apiRequest("PATCH", `/api/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditClient(null);
      toast({ title: "Client Updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update client.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setDeleteTarget(null);
      toast({ title: "Client Removed" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete client.", variant: "destructive" }),
  });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  const ClientForm = ({ onSubmit, loading }: { onSubmit: () => void; loading: boolean }) => (
    <div className="space-y-4">
      <div>
        <Label>Name *</Label>
        <Input placeholder="e.g. Jordan Hayes" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })} data-testid="input-client-name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Email</Label>
          <Input type="email" placeholder="artist@email.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} data-testid="input-client-email" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input placeholder="+1 555-0100" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })} data-testid="input-client-phone" />
        </div>
      </div>
      <div>
        <Label>Client Type</Label>
        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
          <SelectTrigger data-testid="select-client-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CLIENT_TYPES.map(t => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea placeholder="Studio preferences, special requirements…" value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="input-client-notes" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => { setShowAdd(false); setEditClient(null); }}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!form.name || loading} data-testid="button-confirm-client">
          {loading ? "Saving…" : "Save Client"}
        </Button>
      </div>
    </div>
  );

  return (
    <OperatorLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" /> Clients
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Artists, producers, and groups you're working with
            </p>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-client">
                <Plus className="h-4 w-4 mr-2" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
              <ClientForm
                onSubmit={() => createMutation.mutate(form)}
                loading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or email…" value={search}
            onChange={e => setSearch(e.target.value)} data-testid="input-search-clients" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {CLIENT_TYPES.map(t => {
            const ct = clients.filter(c => c.type === t).length;
            return (
              <div key={t} className={`rounded-xl px-4 py-3 ${typeBadge[t] ?? "bg-gray-100 text-gray-700"}`}>
                <p className="text-2xl font-bold">{ct}</p>
                <p className="text-xs capitalize">{t}s</p>
              </div>
            );
          })}
        </div>

        {/* Client list */}
        {clientsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Music2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">{search ? "No clients match your search" : "No clients yet"}</p>
              {!search && <p className="text-sm mt-1">Add your first client to start managing their split sheets.</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(client => (
              <Card key={client.id} className="hover:shadow-md transition-shadow" data-testid={`card-client-${client.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{client.name}</p>
                      <Badge className={`${typeBadge[client.type] ?? "bg-gray-100 text-gray-700"} text-xs capitalize mt-1`}>
                        {client.type}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-client-actions-${client.id}`}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`} className="flex items-center cursor-pointer">
                            <FolderOpen className="mr-2 h-4 w-4" /> View Projects
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setForm({ name: client.name, email: client.email ?? "", phone: client.phone ?? "", type: client.type, notes: client.notes ?? "" }); setEditClient(client); }}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(client)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  {client.notes && (
                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2 italic">{client.notes}</p>
                  )}

                  <div className="mt-4 pt-3 border-t">
                    <Button asChild size="sm" variant="outline" className="w-full text-xs" data-testid={`button-view-projects-${client.id}`}>
                      <Link href={`/clients/${client.id}`}>
                        <FolderOpen className="h-3 w-3 mr-1" /> View Projects
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editClient} onOpenChange={o => { if (!o) setEditClient(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <ClientForm
            onSubmit={() => updateMutation.mutate({ id: editClient!.id, data: form })}
            loading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-1">
            This will remove the client record. Associated projects will remain.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteTarget!.id)}
              disabled={deleteMutation.isPending} data-testid="button-confirm-delete-client">
              {deleteMutation.isPending ? "Deleting…" : "Delete Client"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OperatorLayout>
  );
}
