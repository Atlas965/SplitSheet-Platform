import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Users, Search, FileText, Mail, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Footer from "@/components/Footer";

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  type?: string;
  role?: string;
  notes?: string | null;
  defaultOwnershipPercentage?: number | null;
  defaultRoyaltyPercentage?: number | null;
  contractCount?: number;
  lastActivity?: string;
  source?: "roster" | "project";
}

const CLIENT_TYPES = ["artist", "producer", "songwriter", "group", "label", "publisher"];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  type: "artist",
  notes: "",
  defaultOwnershipPercentage: "",
  defaultRoyaltyPercentage: "",
};

export default function Clients() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);

  const addClient = useMutation({
    mutationFn: () => apiRequest("POST", "/api/clients", form).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowAdd(false);
      setForm(emptyForm);
      toast({ title: "Client added" });
    },
    onError: async (err: any) => {
      toast({ title: "Could not add client", description: err?.message ?? "Try again.", variant: "destructive" });
    },
  });

  const importCsv = useMutation({
    mutationFn: (csv: string) => apiRequest("POST", "/api/clients/import", { csv }).then((r) => r.json()),
    onSuccess: (data: { created: number; skipped: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Import complete",
        description: `${data.created} added${data.skipped ? `, ${data.skipped} skipped` : ""}.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err?.message ?? "Check the CSV and try again.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, isLoading]);

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
  });

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q);
    const role = (c.role || c.type || "").toLowerCase();
    const matchesType = typeFilter === "all" || role === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" /> Clients
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Reusable profiles. Applying a client copies values into a new project and never changes confirmed rights.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const text = await file.text();
                importCsv.mutate(text);
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importCsv.isPending}>
              <Upload className="h-4 w-4 mr-1.5" /> {importCsv.isPending ? "Importing…" : "Import CSV"}
            </Button>
            <Button onClick={() => setShowAdd(true)} data-testid="button-add-client">
              <Plus className="h-4 w-4 mr-1.5" /> Add Client
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by role">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {CLIENT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {clientsLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
            Loading clients…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl text-center py-16">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-foreground">
              {search || typeFilter !== "all" ? "No clients match your filters" : "No clients yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search || typeFilter !== "all"
                ? "Try a different name, email, or role."
                : "Save artists, producers, or labels you work with. Import a CSV with a name column to start faster."}
            </p>
            {!search && typeFilter === "all" && (
              <Button size="sm" onClick={() => setShowAdd(true)}>Add your first client</Button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {filtered.length} client{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent shrink-0">
                      {client.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{client.name}</p>
                        {client.source === "project" && (
                          <Badge variant="outline" className="text-[10px]">From project</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {client.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />{client.email}
                          </span>
                        )}
                        {client.company && (
                          <span className="text-xs text-muted-foreground">{client.company}</span>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">{client.role || client.type}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {client.contractCount ?? 0} project{(client.contractCount ?? 0) !== 1 ? "s" : ""}
                      </div>
                      {client.lastActivity && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(client.lastActivity).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="client-name">Name</Label>
              <Input id="client-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Artist or label name" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="client-email">Email</Label>
                <Input id="client-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="optional" />
              </div>
              <div>
                <Label htmlFor="client-phone">Phone</Label>
                <Input id="client-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="optional" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="client-company">Company</Label>
                <Input id="client-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="optional" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="client-own">Default IP ownership %</Label>
                <Input id="client-own" type="number" min="0" max="100" step="0.01" value={form.defaultOwnershipPercentage} onChange={(e) => setForm({ ...form, defaultOwnershipPercentage: e.target.value })} placeholder="optional" />
              </div>
              <div>
                <Label htmlFor="client-royalty">Default royalty %</Label>
                <Input id="client-royalty" type="number" min="0" max="100" step="0.01" value={form.defaultRoyaltyPercentage} onChange={(e) => setForm({ ...form, defaultRoyaltyPercentage: e.target.value })} placeholder="optional" />
              </div>
            </div>
            <div>
              <Label htmlFor="client-notes">Notes</Label>
              <Textarea id="client-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes — not shown to contributors" />
            </div>
            <Button
              className="w-full"
              disabled={!form.name.trim() || addClient.isPending}
              onClick={() => addClient.mutate()}
            >
              {addClient.isPending ? "Saving…" : "Save client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
