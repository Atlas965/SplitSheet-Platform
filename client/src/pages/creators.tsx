import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Plus, Search, User, Music2, Tag, Globe } from "lucide-react";

const CREATOR_TYPES = ["songwriter", "producer", "artist", "publisher"] as const;
const PRO_LIST = ["SOCAN", "ASCAP", "BMI", "SESAC", "PRS", "APRA", "BUMA", "SABAM", "Other", "None"];

const TYPE_COLORS: Record<string, string> = {
  songwriter: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  producer:   "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  artist:     "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  publisher:  "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

const creatorFormSchema = z.object({
  name:    z.string().min(1, "Name is required"),
  type:    z.enum(CREATOR_TYPES),
  email:   z.string().email("Invalid email").optional().or(z.literal("")),
  pro:     z.string().optional(),
  ipi:     z.string().optional(),
  isni:    z.string().optional(),
  bio:     z.string().optional(),
  website: z.string().optional(),
});
type CreatorFormValues = z.infer<typeof creatorFormSchema>;

export default function Creators() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const { data: creators = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/creators"],
    enabled: isAuthenticated,
  });

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorFormSchema),
    defaultValues: { name: "", type: "songwriter", email: "", pro: "", ipi: "", isni: "", bio: "", website: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatorFormValues) => apiRequest("POST", "/api/creators", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setShowCreate(false);
      form.reset();
      toast({ title: "Creator registered", description: "Permanent SoundLedger ID assigned." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create creator.", variant: "destructive" }),
  });

  const filtered = creators.filter((c: any) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.slCreatorId?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Creator Registry</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Permanent identities for every songwriter, producer, artist, and publisher
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} data-testid="button-add-creator">
            <Plus className="h-4 w-4 mr-2" /> Register Creator
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {CREATOR_TYPES.map(t => (
            <div key={t} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 capitalize">{t}s</p>
              <p className="text-2xl font-bold">{creators.filter((c: any) => c.type === t).length}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or SL-ID…"
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-creators"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CREATOR_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Creator grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                <div className="h-3 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No creators found</p>
            <p className="text-sm mt-1">Register your first creator to assign a permanent SoundLedger ID</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((creator: any) => (
              <Link key={creator.id} href={`/creators/${creator.id}`}>
                <div
                  className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                  data-testid={`card-creator-${creator.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {creator.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{creator.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{creator.slCreatorId}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] px-2 capitalize shrink-0 ${TYPE_COLORS[creator.type] ?? ""}`}>
                      {creator.type}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {creator.pro && (
                      <div className="flex items-center gap-1.5">
                        <Music2 className="h-3 w-3 shrink-0" />
                        <span>{creator.pro}{creator.ipi ? ` · IPI: ${creator.ipi}` : ""}</span>
                      </div>
                    )}
                    {creator.email && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3 w-3 shrink-0" />
                        <span className="truncate">{creator.email}</span>
                      </div>
                    )}
                    {creator.website && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">{creator.website}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register Creator</DialogTitle>
            <p className="text-sm text-muted-foreground">A permanent SL-CREATOR ID will be assigned automatically.</p>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Marcus J. Reid" data-testid="input-creator-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creator Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-creator-type"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CREATOR_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} placeholder="creator@email.com" data-testid="input-creator-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pro" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PRO Affiliation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-creator-pro"><SelectValue placeholder="Select PRO" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRO_LIST.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ipi" render={({ field }) => (
                  <FormItem>
                    <FormLabel>IPI / CAE Number</FormLabel>
                    <FormControl><Input {...field} placeholder="00 123 456 789" data-testid="input-creator-ipi" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isni" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ISNI</FormLabel>
                    <FormControl><Input {...field} placeholder="0000 0001 2345 6789" data-testid="input-creator-isni" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Website</FormLabel>
                    <FormControl><Input {...field} placeholder="https://example.com" data-testid="input-creator-website" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={3}
                        placeholder="Brief description of the creator's work and background…"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        data-testid="textarea-creator-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-creator">
                  {createMutation.isPending ? "Registering…" : "Register Creator"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
