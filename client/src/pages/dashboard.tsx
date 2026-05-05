import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import OperatorLayout from "@/components/OperatorLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, FolderOpen, CheckCircle2, Clock, Plus, ChevronRight,
  Music2, AlertCircle, FileText, BookOpen, Trash2,
} from "lucide-react";

interface DashboardStats {
  totalContracts: number;
  pendingSignatures: number;
  completedThisMonth: number;
  revenueSplit: number;
}

interface Project {
  id: string;
  title: string;
  songTitle: string;
  status: string;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
  type: string;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:                { label: "Draft",               color: "bg-gray-100 text-gray-700",    icon: AlertCircle },
  pending_confirmation: { label: "Pending Confirmation", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmed:            { label: "Confirmed",            color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  archived:             { label: "Archived",             color: "bg-slate-100 text-slate-500",  icon: FolderOpen },
};

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, isLoading]);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    enabled: isAuthenticated,
    retry: false,
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/contracts/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Agreement removed" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  const activeProjects  = projects.filter(p => p.status !== "archived");
  const pendingProjects = projects.filter(p => p.status === "pending_confirmation");
  const confirmedCount  = projects.filter(p => p.status === "confirmed").length;
  const recentProjects  = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <OperatorLayout>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            {(user as any)?.firstName ? `Welcome back, ${(user as any).firstName}` : "Operator Dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            SoundLedger Technologies · SplitSheet Service Operations
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Clients",    value: clients.length,             color: "bg-blue-100 text-blue-700",    icon: Users },
            { label: "Active Projects",  value: activeProjects.length,      color: "bg-purple-100 text-purple-700",icon: FolderOpen },
            { label: "Pending Confirm.", value: pendingProjects.length,     color: "bg-yellow-100 text-yellow-700",icon: Clock },
            { label: "Confirmed",        value: confirmedCount,             color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
          ].map(({ label, value, color, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Projects pipeline */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent Projects</h2>
              <Button asChild size="sm" variant="outline">
                <Link href="/projects"><FolderOpen className="h-3.5 w-3.5 mr-1" /> All Projects</Link>
              </Button>
            </div>

            {projectsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : recentProjects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Music2 className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No projects yet.</p>
                  <Button asChild className="mt-3" size="sm">
                    <Link href="/projects"><Plus className="h-3.5 w-3.5 mr-1" /> Create First Project</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recentProjects.map(p => {
                  const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft;
                  const Icon = cfg.icon;
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`}>
                      <Card className="hover:shadow-sm transition-all cursor-pointer group" data-testid={`dashboard-project-${p.id}`}>
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
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pending confirmations alert */}
            {pendingProjects.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">
                      {pendingProjects.length} project{pendingProjects.length > 1 ? "s" : ""} awaiting confirmation
                    </p>
                    <p className="text-xs text-yellow-700">Share confirmation links with contributors to close these out.</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0 border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                    <Link href="/projects">View</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { href: "/projects",  label: "New Split Sheet Project", icon: Plus,     primary: true },
                  { href: "/clients",   label: "Add Client",              icon: Users,    primary: false },
                  { href: "/contracts", label: "Music Agreements",        icon: FileText, primary: false },
                  { href: "/ownership", label: "Rights Ledger",           icon: BookOpen, primary: false },
                ].map(({ href, label, icon: Icon, primary }) => (
                  <Button key={href} asChild size="sm" variant={primary ? "default" : "ghost"}
                    className={`w-full justify-start ${!primary ? "text-muted-foreground" : ""}`}
                    data-testid={`quick-action-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Link href={href}><Icon className="h-4 w-4 mr-2" />{label}</Link>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Recent Clients */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm">Clients</CardTitle>
                <Button asChild size="sm" variant="ghost" className="text-xs h-7 px-2">
                  <Link href="/clients">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {clients.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No clients yet.</p>
                ) : (
                  <div className="space-y-2">
                    {clients.slice(0, 5).map(c => (
                      <Link key={c.id} href={`/clients/${c.id}`}>
                        <div className="flex items-center gap-2 py-1.5 hover:bg-muted rounded-lg px-2 -mx-2 cursor-pointer transition-colors" data-testid={`dashboard-client-${c.id}`}>
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary text-xs font-bold">{c.name[0]}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{c.type}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Music Agreements */}
            {contracts.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm">Recent Agreements</CardTitle>
                  <Button asChild size="sm" variant="ghost" className="text-xs h-7 px-2">
                    <Link href="/contracts">View all</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {contracts.slice(0, 3).map(c => (
                      <div key={c.id} className="flex items-center gap-2 group py-1">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          c.status === "signed" ? "bg-green-500" :
                          c.status === "pending" ? "bg-yellow-500" : "bg-gray-400"
                        }`} />
                        <Link href={`/contracts/${c.id}`} className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate hover:text-primary transition-colors">{c.title}</p>
                        </Link>
                        <button onClick={() => deleteContractMutation.mutate(c.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-500"
                          data-testid={`btn-delete-contract-${c.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}
