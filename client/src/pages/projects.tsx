import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Music2, Search, Plus, CheckCircle2, Clock, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";

interface Project {
  id: string;
  title: string;
  type: string;
  status: string;
  collaboratorCount?: number;
  collaborators?: { name: string; role: string; ownershipPercentage: number }[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  confirmed:            { label: "Confirmed",  className: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending_confirmation: { label: "Pending",    className: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800", icon: <Clock className="h-3 w-3" /> },
  draft:                { label: "Draft",      className: "bg-muted text-muted-foreground border-border", icon: <FileEdit className="h-3 w-3" /> },
  archived:             { label: "Archived",   className: "bg-muted text-muted-foreground border-border", icon: <FileEdit className="h-3 w-3" /> },
  signed:               { label: "Signed",     className: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending:              { label: "Pending",    className: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800", icon: <Clock className="h-3 w-3" /> },
};

const TYPE_LABELS: Record<string, string> = {
  "split-sheet":  "Split Sheet",
  "performance":  "Performance",
  "producer":     "Producer",
  "management":   "Management",
};

export default function Projects() {
  const { isAuthenticated, isLoading } = useAuth();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, isLoading]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const filtered = projects.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.type ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Summary stats
  const total   = projects.length;
  const signed  = projects.filter((c) => c.status === "confirmed" || c.status === "signed" || c.status === "active").length;
  const pending = projects.filter((c) => c.status === "pending_confirmation" || c.status === "pending").length;
  const draft   = projects.filter((c) => c.status === "draft").length;

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Music2 className="h-6 w-6" /> Projects
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              All your songs, tracks, and music projects
            </p>
          </div>
          <Button asChild>
            <Link href="/templates">
              <Plus className="h-4 w-4 mr-1.5" /> New Project
            </Link>
          </Button>
        </div>

        {/* Stats row */}
        {total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total",   val: total,   color: "text-foreground" },
              { label: "Signed",  val: signed,  color: "text-green-600 dark:text-green-400" },
              { label: "Pending", val: pending, color: "text-yellow-600 dark:text-yellow-400" },
              { label: "Drafts",  val: draft,   color: "text-muted-foreground" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl px-4 py-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {projectsLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
            Loading projects…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl text-center py-16">
            <Music2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-foreground">
              {search ? "No projects match your search" : "No projects yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search ? "Try a different keyword." : "Create your first split sheet to get started."}
            </p>
            {!search && (
              <Button asChild size="sm">
                <Link href="/contract/split-sheet">Create split sheet</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
              const collaborators = project.collaborators ?? [];

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="bg-card border border-border rounded-xl p-5 hover:border-accent/40 hover:shadow-sm transition-all cursor-pointer group">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                        <Music2 className="h-4 w-4 text-accent" />
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.className}`}>
                        {statusCfg.icon}{statusCfg.label}
                      </span>
                    </div>

                    <h3 className="font-semibold text-foreground mb-1 line-clamp-1 group-hover:text-accent transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {TYPE_LABELS[project.type] ?? project.type}
                    </p>

                    {/* Split bars */}
                    {collaborators.length > 0 && (
                      <div className="mb-3">
                        <div className="flex w-full h-2 rounded-full overflow-hidden mb-2">
                          {collaborators.map((c: any, i: number) => {
                            const colors = ["#3b6ef5","#22a06b","#f59e0b","#e05252","#9b59b6"];
                            return (
                              <div
                                key={i}
                                style={{ width: `${c.ownershipPercentage}%`, background: colors[i % colors.length] }}
                              />
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {collaborators.length} collaborator{collaborators.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(project.updatedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}