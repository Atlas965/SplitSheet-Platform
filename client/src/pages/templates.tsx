import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LEGAL_DISCLAIMER } from "@shared/agreement-catalog";
import { Search, FileText, ShieldAlert, Eye } from "lucide-react";

type TemplateRow = {
  id: string;
  name: string;
  type: string;
  slug?: string | null;
  description?: string | null;
  category?: string | null;
  version?: string | null;
  status?: string | null;
  jurisdiction?: string | null;
  legalReviewStatus?: string | null;
  rightsCategories?: string[] | null;
  requiredParties?: string[] | null;
  riskLevel?: string | null;
  isActive?: boolean | null;
  template?: any;
};

type Meta = {
  categories: Array<{ id: string; label: string }>;
  rights: string[];
  riskLevels: string[];
  statuses: string[];
  disclaimer: string;
};

function riskBadge(risk?: string | null) {
  const r = risk || "medium";
  const cls =
    r === "critical" ? "bg-red-100 text-red-800 border-red-200" :
    r === "high" ? "bg-orange-100 text-orange-800 border-orange-200" :
    r === "low" ? "bg-green-100 text-green-800 border-green-200" :
    "bg-yellow-100 text-yellow-800 border-yellow-200";
  return <Badge variant="outline" className={cls}>{r}</Badge>;
}

export default function Templates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [rights, setRights] = useState("all");
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");
  const [jurisdiction, setJurisdiction] = useState("all");
  const [preview, setPreview] = useState<TemplateRow | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  const queryKey = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category !== "all") params.set("category", category);
    if (rights !== "all") params.set("rights", rights);
    if (status !== "all") params.set("status", status);
    if (risk !== "all") params.set("riskLevel", risk);
    if (jurisdiction !== "all") params.set("jurisdiction", jurisdiction);
    return [`/api/templates?${params.toString()}`];
  }, [search, category, rights, status, risk, jurisdiction]);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<TemplateRow[]>({
    queryKey,
    enabled: isAuthenticated,
  });

  const { data: meta } = useQuery<Meta>({
    queryKey: ["/api/templates/meta"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" />
      </div>
    );
  }

  const categories = meta?.categories ?? [];
  const rightsOptions = meta?.rights ?? [];
  const riskOptions = meta?.riskLevels ?? ["low", "medium", "high", "critical"];
  const statusOptions = meta?.statuses ?? [];

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Entertainment Agreement Template Library</h2>
          <p className="text-muted-foreground max-w-3xl">
            Structured music agreement templates mapped to parties, rights, ownership, compensation, and workflow.
          </p>
          <p className="mt-3 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
            {meta?.disclaimer || LEGAL_DISCLAIMER}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="relative md:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rights} onValueChange={setRights}>
            <SelectTrigger><SelectValue placeholder="Rights" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rights</SelectItem>
              {rightsOptions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              {riskOptions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Select value={jurisdiction} onValueChange={setJurisdiction}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Jurisdiction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jurisdictions</SelectItem>
              <SelectItem value="CA">CA</SelectItem>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="UK">UK</SelectItem>
              <SelectItem value="EU">EU</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {loadingTemplates ? "Loading…" : `${templates.length} templates`}
          </span>
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="ml-auto">
              <Link href="/admin">Admin template management</Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-card p-6 rounded-xl border border-border hover:border-accent/60 transition-colors"
              data-testid={`template-${template.type}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    {riskBadge(template.riskLevel)}
                    <Badge variant="secondary">{template.status || "draft"}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{template.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                    <span>Category: {template.category || "—"}</span>
                    <span>·</span>
                    <span>v{template.version || "1.0"}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      {template.legalReviewStatus || "NOT_REVIEWED"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(template.rightsCategories || []).slice(0, 6).map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Required parties: {(template.requiredParties || []).join(", ") || "—"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreview(template)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/contract/${template.type}`}>Create Agreement</Link>
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link href="/admin">Edit</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loadingTemplates && templates.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No templates match these filters.
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>
              Version {preview?.version} · {preview?.category} · {preview?.legalReviewStatus}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{preview?.description}</p>
          <div className="space-y-2 text-sm">
            <p><strong>Rights:</strong> {(preview?.rightsCategories || []).join(", ") || "—"}</p>
            <p><strong>Required parties:</strong> {(preview?.requiredParties || []).join(", ") || "—"}</p>
            <p><strong>Risk:</strong> {preview?.riskLevel}</p>
            <p><strong>Jurisdiction:</strong> {preview?.jurisdiction || "—"}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Fields</h4>
            <ul className="text-sm space-y-1 list-disc pl-5">
              {((preview?.template?.fields || []) as any[]).map((f) => (
                <li key={f.name}>
                  {f.label} <span className="text-muted-foreground">({f.type}{f.required ? ", required" : ""})</span>
                </li>
              ))}
            </ul>
          </div>
          <Button asChild>
            <Link href={`/contract/${preview?.type}`}>Create Agreement</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
