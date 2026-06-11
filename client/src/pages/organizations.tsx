import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import OperatorLayout from "@/components/OperatorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Search, Building2, Globe, Mail, Key } from "lucide-react";

const ORG_TYPES = ["label", "studio", "publisher", "distributor", "pro"] as const;

const TYPE_COLORS: Record<string, string> = {
  label:       "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  studio:      "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  publisher:   "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  distributor: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  pro:         "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

const TYPE_LABELS: Record<string, string> = {
  label: "Record Label", studio: "Studio", publisher: "Publisher",
  distributor: "Distributor", pro: "PRO / CMO",
};

const orgFormSchema = z.object({
  name:    z.string().min(1, "Name is required"),
  type:    z.enum(ORG_TYPES),
  email:   z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().optional(),
  country: z.string().optional(),
});
type OrgFormValues = z.infer<typeof orgFormSchema>;

export default function Organizations() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const { data: orgs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/organizations"],
    enabled: isAuthenticated,
  });

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: { name: "", type: "label", email: "", website: "", country: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: OrgFormValues) => apiRequest("POST", "/api/organizations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setShowCreate(false);
      form.reset();
      toast({ title: "Organization created", description: "Permanent SL-ORG ID assigned." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create organization.", variant: "destructive" }),
  });

  const filtered = orgs.filter((o: any) => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slOrgId?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || o.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <OperatorLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Labels, studios, publishers, and distributors with permanent SL-ORG IDs and workspace access
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} data-testid="button-add-org">
            <Plus className="h-4 w-4 mr-2" /> Add Organization
          </Button>
        </div>

        {/* Type stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {ORG_TYPES.map(t => (
            <div key={t} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{TYPE_LABELS[t]}</p>
              <p className="text-xl font-bold">{orgs.filter((o: any) => o.type === t).length}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or email…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-orgs"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44" data-testid="select-org-type-filter">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ORG_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Org grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No organizations found</p>
            <p className="text-sm mt-1">Add your first organization to enable workspace and API key management</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((org: any) => (
              <Link key={org.id} href={`/organizations/${org.id}`}>
                <div
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                  data-testid={`card-org-${org.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {org.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{org.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{org.slOrgId}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] px-2 shrink-0 ${TYPE_COLORS[org.type] ?? ""}`}>
                      {TYPE_LABELS[org.type] ?? org.type}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {org.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{org.email}</div>}
                    {org.website && <div className="flex items-center gap-1.5"><Globe className="h-3 w-3" />{org.website}</div>}
                    {org.country && <div className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />{org.country}</div>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Key className="h-3 w-3" /> API Keys</span>
                    <span>View workspace →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <p className="text-sm text-muted-foreground">A permanent SL-ORG ID will be assigned automatically.</p>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4 mt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Organization Name *</FormLabel><FormControl><Input {...field} placeholder="e.g. Apex Records" data-testid="input-org-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger data-testid="select-org-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ORG_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} placeholder="contact@org.com" data-testid="input-org-email" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} placeholder="https://…" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} placeholder="CA" /></FormControl></FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-org">
                  {createMutation.isPending ? "Creating…" : "Create Organization"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
