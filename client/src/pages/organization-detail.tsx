import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Plus, Key, Copy, CheckCircle, Trash2, Users, Eye, EyeOff } from "lucide-react";

const SCOPES = ["read:songs", "write:songs", "read:ownership", "write:ownership", "read:contracts", "write:contracts", "read:revenue", "admin"];
const MEMBER_ROLES = ["owner", "admin", "member", "viewer"];

const apiKeySchema = z.object({
  name:   z.string().min(1, "Name is required"),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
});

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showNewKeyResult, setShowNewKeyResult] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read:songs"]);

  const { data: org, isLoading } = useQuery<any>({
    queryKey: ["/api/organizations", id],
    enabled: isAuthenticated && !!id,
  });

  const { data: apiKeys = [] } = useQuery<any[]>({
    queryKey: ["/api/organizations", id, "api-keys"],
    enabled: isAuthenticated && !!id,
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/organizations", id, "members"],
    enabled: isAuthenticated && !!id,
  });

  const form = useForm({ resolver: zodResolver(apiKeySchema), defaultValues: { name: "", scopes: ["read:songs"] } });

  const createKeyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/organizations/${id}/api-keys`, data),
    onSuccess: async (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", id, "api-keys"] });
      setNewKeyValue(res.rawKey);
      setShowNewKey(false);
      setShowNewKeyResult(true);
      form.reset();
    },
    onError: () => toast({ title: "Error", description: "Failed to create API key.", variant: "destructive" }),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (keyId: string) => apiRequest("DELETE", `/api/organizations/${id}/api-keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", id, "api-keys"] });
      toast({ title: "API key revoked" });
    },
  });

  const copyKey = () => {
    if (newKeyValue) {
      navigator.clipboard.writeText(newKeyValue);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  if (isLoading) return (
    <>
      <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4">
        <div className="h-6 bg-muted rounded w-1/4" /><div className="h-40 bg-muted rounded" />
      </div>
    </>
  );

  if (!org) return <><div className="p-6 text-center text-muted-foreground">Organization not found.</div></>;

  const activeKeys = apiKeys.filter((k: any) => !k.revokedAt);

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/organizations">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors" data-testid="button-back-orgs">
            <ArrowLeft className="h-4 w-4" /> Back to Organizations
          </button>
        </Link>

        {/* Org header */}
        <div className="bg-card border border-border rounded-xl p-6 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-lg">
              {org.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{org.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded" data-testid="text-sl-org-id">{org.slOrgId}</span>
                <Badge className="text-[10px] capitalize">{org.type}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-6 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
            {org.email && <span>✉ {org.email}</span>}
            {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">🌐 {org.website}</a>}
            {org.country && <span>📍 {org.country}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* API Keys */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> API Keys</h2>
                <p className="text-xs text-muted-foreground mt-0.5">For external integrations and automations</p>
              </div>
              <Button size="sm" onClick={() => setShowNewKey(true)} data-testid="button-create-api-key">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Key
              </Button>
            </div>

            {activeKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No API keys yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeKeys.map((key: any) => (
                  <div key={key.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg" data-testid={`card-api-key-${key.id}`}>
                    <div>
                      <p className="text-sm font-medium">{key.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{key.keyPrefix}••••••••</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(key.scopes ?? []).map((s: string) => (
                          <span key={s} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => revokeKeyMutation.mutate(key.id)}
                      data-testid={`button-revoke-key-${key.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Members</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Role-based access control</p>
              </div>
            </div>

            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No members yet</p>
                <p className="text-xs mt-1">Members can be added by inviting users to this workspace</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold">
                        {m.userId?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="text-sm">{m.userId}</span>
                    </div>
                    <Badge className="text-[10px] capitalize">{m.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create API Key dialog */}
      <Dialog open={showNewKey} onOpenChange={setShowNewKey}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>The key will only be shown once. Copy it immediately.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createKeyMutation.mutate({ ...v, scopes: selectedScopes }))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Key Name *</FormLabel><FormControl><Input {...field} placeholder="e.g. Production Integration" data-testid="input-api-key-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <div>
                <p className="text-sm font-medium mb-2">Scopes *</p>
                <div className="flex flex-wrap gap-2">
                  {SCOPES.map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => toggleScope(s)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        selectedScopes.includes(s)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                      data-testid={`button-scope-${s}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {selectedScopes.length === 0 && <p className="text-xs text-destructive mt-1">Select at least one scope</p>}
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowNewKey(false)}>Cancel</Button>
                <Button type="submit" disabled={createKeyMutation.isPending || selectedScopes.length === 0} data-testid="button-submit-api-key">
                  {createKeyMutation.isPending ? "Generating…" : "Generate Key"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Show new key (one-time reveal) */}
      <Dialog open={showNewKeyResult} onOpenChange={setShowNewKeyResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>Copy this key now — it will not be shown again.</DialogDescription>
          </DialogHeader>
          <div className="my-4 p-3 bg-muted rounded-lg flex items-center justify-between gap-3">
            <code className="text-xs font-mono break-all text-foreground">{newKeyValue}</code>
            <button onClick={copyKey} className="shrink-0 text-muted-foreground hover:text-foreground" data-testid="button-copy-api-key">
              {copiedKey ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowNewKeyResult(false); setNewKeyValue(null); }} data-testid="button-confirm-key-copied">
              I've copied the key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
