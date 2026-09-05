import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Plus, Users, FolderOpen, FileText } from "lucide-react";
import WorkflowBanner from "@/components/WorkflowBanner";
import { apiRequest } from "@/lib/queryClient";

interface DashboardStats {
  totalProjects?: number;
  pendingConfirmation?: number;
  confirmedThisMonth?: number;
  drafts?: number;
  totalContracts?: number;
  pendingSignatures?: number;
  completedThisMonth?: number;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    const code = localStorage.getItem("splitsheet_ref");
    if (!code) return;
    apiRequest("POST", "/api/referrals/claim", { code })
      .then(() => localStorage.removeItem("splitsheet_ref"))
      .catch(() => localStorage.removeItem("splitsheet_ref"));
  }, [isAuthenticated]);

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

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkflowBanner />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Projects"
            value={statsLoading ? "..." : (stats?.totalProjects ?? stats?.totalContracts ?? 0).toString()}
            icon="fas fa-folder-open"
            iconBg="bg-accent/10"
            iconColor="text-accent"
            data-testid="stat-total-contracts"
          />
          <StatCard
            title="Pending confirmation"
            value={statsLoading ? "..." : (stats?.pendingConfirmation ?? stats?.pendingSignatures ?? 0).toString()}
            icon="fas fa-clock"
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
            data-testid="stat-pending-signatures"
          />
          <StatCard
            title="Confirmed this month"
            value={statsLoading ? "..." : (stats?.confirmedThisMonth ?? stats?.completedThisMonth ?? 0).toString()}
            icon="fas fa-check"
            iconBg="bg-green-100"
            iconColor="text-green-600"
            data-testid="stat-completed-month"
          />
          <StatCard
            title="Drafts"
            value={statsLoading ? "..." : (stats?.drafts ?? 0).toString()}
            icon="fas fa-file-alt"
            iconBg="bg-muted"
            iconColor="text-muted-foreground"
            data-testid="stat-drafts"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold mb-4">Recent projects</h3>
            <div className="space-y-4" data-testid="recent-activity">
              {contractsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : contracts && contracts.length > 0 ? (
                contracts.slice(0, 3).map((contract) => (
                  <div key={contract.id} className="flex items-center space-x-4 p-4 bg-muted rounded-lg group hover:bg-muted/80 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      contract.status === 'signed' || contract.status === 'confirmed' ? 'bg-green-100' :
                      contract.status === 'pending' || contract.status === 'pending_confirmation' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <i className={`fas ${
                        contract.status === 'signed' || contract.status === 'confirmed' ? 'fa-check text-green-600' :
                        contract.status === 'pending' || contract.status === 'pending_confirmation' ? 'fa-clock text-yellow-600' : 'fa-plus text-blue-600'
                      }`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{contract.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {contract.status === 'signed' || contract.status === 'confirmed' ? 'Confirmed' :
                         contract.status === 'pending' || contract.status === 'pending_confirmation' ? 'Pending confirmation' :
                         contract.status === 'draft' ? 'Draft' : 'Updated'} •
                        {new Date(contract.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/projects/${contract.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <i className="fas fa-file-contract text-4xl mb-4"></i>
                  <p>No projects yet. Create your first project to document a split.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border" data-tour="quick-actions">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button asChild className="w-full justify-start space-x-3 p-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90" data-testid="button-new-project">
                <Link href="/projects?new=1">
                  <Plus className="h-4 w-4" />
                  <span>New Project</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start space-x-3 p-3" data-testid="button-manage-clients">
                <Link href="/clients">
                  <Users className="h-4 w-4" />
                  <span>Manage Clients</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start space-x-3 p-3" data-testid="button-view-projects">
                <Link href="/projects">
                  <FolderOpen className="h-4 w-4" />
                  <span>View All Projects</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start space-x-3 p-3" data-testid="button-create-contract">
                <Link href="/templates">
                  <FileText className="h-4 w-4" />
                  <span>Browse Entertainment Agreement Templates</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
