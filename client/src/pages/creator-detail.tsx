import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Music2, Globe, Mail, Copy, Pencil, Trash2, CheckCircle } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  songwriter: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  producer:   "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  artist:     "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  publisher:  "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};
const CREATOR_TYPES = ["songwriter", "producer", "artist", "publisher"] as const;
const PRO_LIST = ["SOCAN", "ASCAP", "BMI", "SESAC", "PRS", "APRA", "BUMA", "SABAM", "Other", "None"];

const editSchema = z.object({
  name:    z.string().min(1),
  type:    z.enum(CREATOR_TYPES),
  email:   z.string().email().optional().or(z.literal("")),
  pro:     z.string().optional(),
  ipi:     z.string().optional(),
  isni:    z.string().optional(),
  bio:     z.string().optional(),
  website: z.string().optional(),
});

export default function CreatorDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: creator, isLoading } = useQuery<any>({
    queryKey: ["/api/creators", id],
    enabled: isAuthenticated && !!id,
  });

  const form = useForm({ resolver: zodResolver(editSchema), values: creator ?? {} });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/creators/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      setShowEdit(false);
      toast({ title: "Creator updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/creators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      window.location.href = "/creators";
    },
  });

  const copyId = () => {
    if (creator?.slCreatorId) {
      navigator.clipboard.writeText(creator.slCreatorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return (
    <>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    </>
  );

  if (!creator) return (
    <>
      <div className="p-6 text-center text-muted-foreground">Creator not found.</div>
    </>
  );

  return (
    <>
      <div className="p-6 max-w-3xl mx-auto">
        <Link href="/creators">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors" data-testid="button-back-creators">
            <ArrowLeft className="h-4 w-4" /> Back to Creator Registry
          </button>
        </Link>

        {/* Profile card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                {creator.name[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{creator.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded" data-testid="text-sl-creator-id">
                    {creator.slCreatorId}
                  </span>
                  <button onClick={copyId} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-copy-sl-id">
                    {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} data-testid="button-edit-creator">
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowDelete(true)} data-testid="button-delete-creator">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {creator.bio && <p className="mt-4 text-sm text-muted-foreground border-t border-border pt-4">{creator.bio}</p>}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold">Identity</h3>
            <Row label="Type"><Badge className={`text-[10px] capitalize ${TYPE_COLORS[creator.type] ?? ""}`}>{creator.type}</Badge></Row>
            {creator.pro  && <Row label="PRO"><span className="text-sm">{creator.pro}</span></Row>}
            {creator.ipi  && <Row label="IPI / CAE"><span className="text-sm font-mono">{creator.ipi}</span></Row>}
            {creator.isni && <Row label="ISNI"><span className="text-sm font-mono">{creator.isni}</span></Row>}
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold">Contact</h3>
            {creator.email && (
              <Row label="Email">
                <a href={`mailto:${creator.email}`} className="text-sm text-primary flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />{creator.email}
                </a>
              </Row>
            )}
            {creator.website && (
              <Row label="Website">
                <a href={creator.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />{creator.website}
                </a>
              </Row>
            )}
            <Row label="Registered">
              <span className="text-sm text-muted-foreground">{creator.createdAt ? new Date(creator.createdAt).toLocaleDateString() : "—"}</span>
            </Row>
          </div>
        </div>

        {/* Future expansion hooks */}
        <div className="bg-muted/40 border border-dashed border-border rounded-xl p-5 text-center">
          <Music2 className="h-7 w-7 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">Songs &amp; Ownership</p>
          <p className="text-xs text-muted-foreground mt-1">Linked song assets and ownership history will appear here once songs are registered against this creator.</p>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Creator</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => updateMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CREATOR_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pro" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PRO</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{PRO_LIST.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="ipi" render={({ field }) => (
                  <FormItem><FormLabel>IPI / CAE</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="isni" render={({ field }) => (
                  <FormItem><FormLabel>ISNI</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Website</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="bio" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <textarea {...field} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving…" : "Save Changes"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Creator</DialogTitle>
            <DialogDescription>This will remove <strong>{creator.name}</strong> ({creator.slCreatorId}) from the registry. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-creator">
              {deleteMutation.isPending ? "Removing…" : "Remove Creator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
